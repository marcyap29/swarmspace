export interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  JINA_API_KEY?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && (url.pathname === "/invoke" || url.pathname === "/")) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const body = (await request.json()) as {
        url?: string;
        summarize?: boolean;
      };

      const targetUrl = body.url;
      if (!targetUrl) {
        return jsonResponse({ error: "Missing required parameter: url" }, 400);
      }

      const apiUrl = `https://r.jina.ai/${targetUrl}`;

      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Return-Format": "json",
      };
      if (env.JINA_API_KEY) {
        headers["Authorization"] = `Bearer ${env.JINA_API_KEY}`;
      }

      const apiResponse = await fetch(apiUrl, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });

      if (!apiResponse.ok) {
        return jsonResponse(
          { error: `Jina Reader API error: ${apiResponse.status}` },
          apiResponse.status,
        );
      }

      const data = (await apiResponse.json()) as {
        data?: {
          title?: string;
          content?: string;
          url?: string;
          description?: string;
        };
      };

      const result = data.data ?? data;

      return jsonResponse({
        title: (result as Record<string, unknown>).title,
        content: (result as Record<string, unknown>).content,
        url: (result as Record<string, unknown>).url,
        description: (result as Record<string, unknown>).description,
        source: "jina-reader",
        count: 1,
      });
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};
