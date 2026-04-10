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

    if (request.method === "POST" && (url.pathname === "/invoke" || url.pathname === "/")) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      let body: { query?: string; limit?: number };
      try {
        body = (await request.json()) as { query?: string; limit?: number };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const query = body.query;
      if (!query) {
        return jsonResponse({ error: "Missing required parameter: query" }, 400);
      }

      const limit = Math.min(Math.max(body.limit ?? 5, 1), 20);

      const apiUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${limit}&tags=story`;

      const apiResponse = await fetch(apiUrl, {
        signal: AbortSignal.timeout(15_000),
      });

      if (!apiResponse.ok) {
        return jsonResponse(
          { error: `HN API error: ${apiResponse.status}` },
          apiResponse.status,
        );
      }

      const data = (await apiResponse.json()) as {
        hits: Array<Record<string, unknown>>;
      };

      const results = data.hits.map((hit) => ({
        title: hit.title,
        url: hit.url,
        points: hit.points,
        author: hit.author,
        created_at: hit.created_at,
        num_comments: hit.num_comments,
        objectID: hit.objectID,
        hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      }));
      return jsonResponse({
        results,
        source: "hackernews",
        count: results.length,
      });
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};
