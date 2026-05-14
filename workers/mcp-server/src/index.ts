import { MCP_TOOLS, toolByName } from "./tools";

interface Env {
  ORCHESTRATOR_URL: string;
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
  MCP_KEY_SECRET: string;
  SWARMSPACE_INTERNAL_TOKEN: string;
}

function decodeBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return atob(b64 + pad);
}

async function validateApiKey(apiKey: string, secret: string): Promise<string | null> {
  if (!apiKey.startsWith("ss_mcp_")) return null;

  const stripped = apiKey.slice("ss_mcp_".length);
  const parts = stripped.split(".");
  if (parts.length !== 3) return null;

  const [uidB64, tsB64, hmacHex] = parts;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(`${uidB64}.${tsB64}`)
  );
  const expectedHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex.length !== hmacHex.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ hmacHex.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    return decodeBase64Url(uidB64);
  } catch {
    return null;
  }
}

function jsonRpcResponse(id: unknown, result: unknown): Response {
  return corsResponse(JSON.stringify({ jsonrpc: "2.0", id, result }), 200);
}

function jsonRpcError(id: unknown, code: number, message: string): Response {
  return corsResponse(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
    200
  );
}

function corsResponse(body: string | null, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    if (url.pathname === "/.well-known/mcp/manifest.json" && request.method === "GET") {
      return corsResponse(
        JSON.stringify({
          schema_version: "1.0",
          name: "SwarmSpace",
          description:
            "Intelligence layer for Claude — 13 workflow chains for competitive analysis, market scanning, research synthesis, meeting prep, tech evaluation, health research, and more.",
          version: "1.0.0",
          auth: {
            type: "bearer",
            instructions:
              "Generate your SwarmSpace MCP API key from your SwarmSpace dashboard settings page.",
          },
          tools_count: 13,
          endpoint: "https://swarmspace-mcp-server.orbitalai.workers.dev/mcp",
        }),
        200
      );
    }

    if (url.pathname === "/mcp" && request.method === "POST") {
      let rpc: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
      try {
        rpc = await request.json();
      } catch {
        return jsonRpcError(null, -32700, "Parse error");
      }

      const { id, method, params = {} } = rpc;

      if (method === "initialize") {
        return jsonRpcResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: env.MCP_SERVER_NAME,
            version: env.MCP_SERVER_VERSION,
          },
        });
      }

      if (method === "notifications/initialized") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      }

      const authHeader = request.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const uid = await validateApiKey(token, env.MCP_KEY_SECRET);
      if (!uid) {
        return jsonRpcError(id, -32001, "Invalid or missing API key");
      }

      if (method === "tools/list") {
        return jsonRpcResponse(id, {
          tools: MCP_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
      }

      if (method === "tools/call") {
        const callParams = params as { name?: string; arguments?: Record<string, unknown> };
        const toolName = callParams.name ?? "";
        const args = callParams.arguments ?? {};

        const tool = toolByName(toolName);
        if (!tool) {
          return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
        }

        const body = {
          query: (args.query as string) ?? (args.attendee_name as string) ?? "",
          ...args,
          _service_token: env.SWARMSPACE_INTERNAL_TOKEN,
          _run_as_uid: uid,
        };

        let resp: Response;
        try {
          resp = await fetch(`${env.ORCHESTRATOR_URL}${tool.orchestratorRoute}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(55_000),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return jsonRpcError(id, -32603, `Orchestrator request failed: ${msg}`);
        }

        if (!resp.ok) {
          const text = await resp.text();
          return jsonRpcError(id, -32603, `Orchestrator error (${resp.status}): ${text}`);
        }

        let orchestratorResult: unknown;
        try {
          orchestratorResult = await resp.json();
        } catch {
          return jsonRpcError(id, -32603, "Orchestrator returned invalid JSON");
        }

        return jsonRpcResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(orchestratorResult, null, 2),
            },
          ],
        });
      }

      return jsonRpcError(id, -32601, "Method not found");
    }

    return corsResponse(JSON.stringify({ error: "Not found" }), 404);
  },
};
