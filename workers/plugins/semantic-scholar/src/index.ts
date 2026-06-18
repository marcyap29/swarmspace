interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  S2_API_KEY?: string;
}

interface SemanticScholarPaper {
  title?: string;
  abstract?: string;
  authors?: Array<{ name: string }>;
  year?: number;
  externalIds?: { DOI?: string };
  openAccessPdf?: { url?: string };
}

interface SemanticScholarResponse {
  data?: SemanticScholarPaper[];
}

async function fetchWithRetry(url: string, headers: Record<string, string>, maxRetries = 3): Promise<Response> {
  let delay = 1000;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (res.status !== 429) return res;
    if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  return fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
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

      const limit = Math.min(body.limit ?? 5, 10);

      const apiUrl = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
      apiUrl.searchParams.set("query", query);
      apiUrl.searchParams.set("limit", String(limit));
      apiUrl.searchParams.set("fields", "title,abstract,authors,year,externalIds,openAccessPdf");

      const headers: Record<string, string> = {
        "User-Agent": "SwarmSpace/1.0 (contact@orbitalai.net)",
      };
      if (env.S2_API_KEY) headers["x-api-key"] = env.S2_API_KEY;

      const res = await fetchWithRetry(apiUrl.toString(), headers);

      if (!res.ok) {
        // 429 means rate-limited — return empty rather than hard error so callers degrade gracefully
        if (res.status === 429) {
          return corsResponse(
            JSON.stringify({ results: [], source: "semantic-scholar", count: 0, quota: { limit: -1, used: 0, remaining: -1, resets_at: "" }, note: "rate_limited" }),
            200,
          );
        }
        return corsResponse(
          JSON.stringify({ error: `Semantic Scholar API error: ${res.status}` }),
          502,
        );
      }

      const data = (await res.json()) as SemanticScholarResponse;
      const papers = data.data ?? [];

      const results = papers.map((paper) => {
        let paperUrl = "";
        if (paper.openAccessPdf?.url) {
          paperUrl = paper.openAccessPdf.url;
        } else if (paper.externalIds?.DOI) {
          paperUrl = `https://doi.org/${paper.externalIds.DOI}`;
        }
        return {
          title: paper.title ?? "",
          abstract: paper.abstract ? paper.abstract.slice(0, 500) : "",
          authors: (paper.authors ?? []).map((a) => a.name),
          year: paper.year ?? null,
          url: paperUrl,
          published: paper.year ? String(paper.year) : "",
        };
      });

      return corsResponse(
        JSON.stringify({
          results,
          source: "semantic-scholar",
          count: results.length,
          quota: { limit: -1, used: 0, remaining: -1, resets_at: "" },
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
