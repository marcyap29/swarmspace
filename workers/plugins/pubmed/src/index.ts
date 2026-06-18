interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  NCBI_API_KEY?: string;
}

interface PubMedArticle {
  title?: string;
  authors?: Array<{ name: string }>;
  source?: string;
  pubdate?: string;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let delay = 1000;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (res.status !== 429) return res;
    if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  return fetch(url, { signal: AbortSignal.timeout(15_000) });
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

      let body: { query?: string; limit?: number; ncbi_api_key?: string };
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
      const apiKey = body.ncbi_api_key || env.NCBI_API_KEY;

      // Step 1: Search for PubMed IDs
      const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
      searchUrl.searchParams.set("db", "pubmed");
      searchUrl.searchParams.set("retmode", "json");
      searchUrl.searchParams.set("term", query);
      searchUrl.searchParams.set("retmax", String(limit));
      if (apiKey) searchUrl.searchParams.set("api_key", apiKey);

      const searchRes = await fetchWithRetry(searchUrl.toString());
      if (!searchRes.ok) {
        return corsResponse(
          JSON.stringify({ error: `PubMed search error: ${searchRes.status}` }),
          502,
        );
      }

      const searchData = (await searchRes.json()) as {
        esearchresult?: { idlist?: string[] };
      };
      const ids = searchData.esearchresult?.idlist ?? [];

      if (ids.length === 0) {
        return corsResponse(JSON.stringify({ results: [], source: "pubmed", count: 0 }), 200);
      }

      // Step 2: Fetch article summaries
      const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
      summaryUrl.searchParams.set("db", "pubmed");
      summaryUrl.searchParams.set("retmode", "json");
      summaryUrl.searchParams.set("id", ids.join(","));
      if (apiKey) summaryUrl.searchParams.set("api_key", apiKey);

      const summaryRes = await fetchWithRetry(summaryUrl.toString());
      if (!summaryRes.ok) {
        return corsResponse(
          JSON.stringify({ error: `PubMed summary error: ${summaryRes.status}` }),
          502,
        );
      }

      const summaryData = (await summaryRes.json()) as {
        result?: Record<string, PubMedArticle>;
      };
      const resultMap = summaryData.result ?? {};

      const results = ids
        .filter((id) => resultMap[id])
        .map((id) => {
          const article = resultMap[id];
          return {
            title: article.title ?? "",
            authors: (article.authors ?? []).map((a: { name: string }) => a.name),
            source: article.source ?? "",
            pubDate: article.pubdate ?? "",
            pmid: id,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}`,
          };
        });

      return corsResponse(JSON.stringify({ results, source: "pubmed", count: results.length }), 200);
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
