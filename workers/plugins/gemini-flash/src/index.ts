export interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  GEMINI_API_KEY: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-3-flash-preview";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || (url.pathname !== "/invoke" && url.pathname !== "/")) {
      return jsonResponse({ error: "Not found" }, 404);
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: { prompt?: string; _apiKeyOverride?: string };
    try {
      body = (await request.json()) as { prompt?: string; _apiKeyOverride?: string };
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return jsonResponse({ error: "Missing required parameter: prompt" }, 400);
    }

    const apiKey = body._apiKeyOverride?.trim() || env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: "Gemini API key not configured" }, 500);
    }

    const geminiUrl = `${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      return jsonResponse({ error: `Gemini request failed: ${String(err)}` }, 500);
    }

    let geminiBody: unknown;
    try {
      geminiBody = await geminiResponse.json();
    } catch {
      return jsonResponse({ error: "Gemini returned invalid response" }, 500);
    }

    if (!geminiResponse.ok) {
      const errBody = geminiBody as Record<string, unknown>;
      const errMsg = (errBody?.error as Record<string, unknown>)?.message ?? "Gemini API error";
      return jsonResponse({ error: `Upstream Gemini API error: ${errMsg}` }, 500);
    }

    const candidates = (geminiBody as Record<string, unknown>)?.candidates as unknown[];
    const text = (
      (candidates?.[0] as Record<string, unknown>)?.content as Record<string, unknown>
    )?.parts?.[0];
    const responseText = (text as Record<string, unknown>)?.text as string | undefined;

    if (!responseText) {
      return jsonResponse({ error: "Gemini returned empty response" }, 500);
    }

    return jsonResponse({ text: responseText, source: "gemini-flash" });
  },
};
