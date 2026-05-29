interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    if (request.method === "POST" && (url.pathname === "/invoke" || url.pathname === "/")) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
        return corsResponse(JSON.stringify({ error: "Unauthorized" }), 401);
      }

      let body: { query?: string; limit?: number };
      try {
        body = await request.json();
      } catch {
        return corsResponse(JSON.stringify({ error: "Invalid JSON body" }), 400);
      }

      const query = body.query;
      if (!query) {
        return corsResponse(JSON.stringify({ error: "Missing required field: query" }), 400);
      }

      const limit = Math.min(Math.max(body.limit ?? 5, 1), 20);

      const apiUrl = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
      apiUrl.searchParams.set("query", query);
      apiUrl.searchParams.set("limit", String(limit));
      apiUrl.searchParams.set("fields", "title,abstract,year,authors,citationCount,url,externalIds");

      const res = await fetch(apiUrl.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`Semantic Scholar API ${res.status}:`, errBody);
        return corsResponse(
          JSON.stringify({ error: `Semantic Scholar API error: ${res.status}` }),
          502,
        );
      }

      const data = (await res.json()) as { total: number; data: Record<string, unknown>[] };

      const results = (data.data ?? []).map((paper) => ({
        title: (paper.title as string) ?? "",
        abstract: (paper.abstract as string) ?? "",
        year: (paper.year as number) ?? null,
        authors: ((paper.authors as { name: string }[]) ?? []).map((a) => a.name),
        citationCount: (paper.citationCount as number) ?? 0,
        url:
          (paper.url as string) ??
          `https://www.semanticscholar.org/paper/${paper.paperId as string}`,
        doi: ((paper.externalIds as Record<string, string>) ?? {}).DOI ?? null,
        arxivId: ((paper.externalIds as Record<string, string>) ?? {}).ArXiv ?? null,
      }));

      return corsResponse(
        JSON.stringify({
          results,
          source: "semantic-scholar",
          count: results.length,
          total: data.total,
        }),
        200,
      );
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
