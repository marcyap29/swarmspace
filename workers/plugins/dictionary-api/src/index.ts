export interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
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

    if (request.method === "POST" && url.pathname === "/invoke") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const body = (await request.json()) as { word?: string };

      const word = body.word;
      if (!word) {
        return jsonResponse({ error: "Missing required parameter: word" }, 400);
      }

      const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

      const apiResponse = await fetch(apiUrl, {
        signal: AbortSignal.timeout(15_000),
      });

      if (apiResponse.status === 404) {
        return jsonResponse({ results: [], error: "Word not found" });
      }

      if (!apiResponse.ok) {
        return jsonResponse(
          { error: `Dictionary API error: ${apiResponse.status}` },
          apiResponse.status,
        );
      }

      const data = (await apiResponse.json()) as Array<{
        word: string;
        phonetic?: string;
        meanings: Array<{
          partOfSpeech: string;
          definitions: Array<{ definition: string; example?: string }>;
        }>;
      }>;

      return jsonResponse({
        results: data.map((entry) => ({
          word: entry.word,
          phonetic: entry.phonetic,
          meanings: entry.meanings.map((m) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.map((d) => ({
              definition: d.definition,
              example: d.example,
            })),
          })),
        })),
      });
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};
