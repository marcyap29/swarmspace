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

      let body: { query?: string; type?: string; limit?: number; github_token?: string };
      try {
        body = (await request.json()) as { query?: string; type?: string; limit?: number; github_token?: string };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const query = body.query;
      if (!query) {
        return jsonResponse({ error: "Missing required parameter: query" }, 400);
      }

      const searchType = body.type ?? "repositories";
      const limit = Math.min(Math.max(body.limit ?? 5, 1), 30);

      let apiUrl: string;
      if (searchType === "users") {
        apiUrl = `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${limit}`;
      } else {
        apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars&order=desc`;
      }

      const headers: Record<string, string> = {
        "User-Agent": "SwarmSpace/1.0",
        Accept: "application/vnd.github.v3+json",
      };
      if (body.github_token) {
        headers["Authorization"] = `token ${body.github_token}`;
      }

      const apiResponse = await fetch(apiUrl, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });

      if (!apiResponse.ok) {
        return jsonResponse(
          { error: `GitHub API error: ${apiResponse.status}` },
          apiResponse.status,
        );
      }

      const data = (await apiResponse.json()) as Record<string, unknown>;

      if (searchType === "users") {
        const items = data.items as Array<Record<string, unknown>>;
        const results = items.map((u) => ({
          login: u.login,
          url: u.html_url,
          avatar_url: u.avatar_url,
          type: u.type,
        }));
        return jsonResponse({
          results,
          source: "github-public",
          count: results.length,
        });
      }

      const items = data.items as Array<Record<string, unknown>>;
      const results = items.map((r) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        language: r.language,
        url: r.html_url,
        updated_at: r.updated_at,
      }));
      return jsonResponse({
        results,
        source: "github-public",
        count: results.length,
      });
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};
