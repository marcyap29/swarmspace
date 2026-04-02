interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/invoke") {
      const authHeader = request.headers.get("Authorization");
      if (
        !authHeader ||
        authHeader !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`
      ) {
        return corsResponse(JSON.stringify({ error: "Unauthorized" }), 401);
      }

      let body: { query?: string; limit?: number };
      try {
        body = await request.json();
      } catch {
        return corsResponse(
          JSON.stringify({ error: "Invalid JSON body" }),
          400,
        );
      }

      const query = body.query;
      if (!query) {
        return corsResponse(
          JSON.stringify({ error: "Missing required field: query" }),
          400,
        );
      }

      const limit = body.limit ?? 5;

      const apiUrl = new URL("https://nominatim.openstreetmap.org/search");
      apiUrl.searchParams.set("format", "json");
      apiUrl.searchParams.set("q", query);
      apiUrl.searchParams.set("limit", String(limit));

      const res = await fetch(apiUrl.toString(), {
        headers: {
          "User-Agent": "SwarmSpace/1.0 (contact@orbitalai.net)",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return corsResponse(
          JSON.stringify({ error: `Nominatim API error: ${res.status}` }),
          502,
        );
      }

      const data = (await res.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
        type: string;
        importance: number;
      }>;

      const results = data.map((item) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
        type: item.type,
        importance: item.importance,
      }));

      return corsResponse(JSON.stringify({ results }), 200);
    }

    return corsResponse(JSON.stringify({ error: "Not found" }), 404);
  },
};

function corsResponse(body: string | null, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
