interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  SEMANTIC_SCHOLAR_API_KEY?: string;
}

const GRAPH_BASE = "https://api.semanticscholar.org/graph/v1";
const RECS_BASE = "https://api.semanticscholar.org/recommendations/v1";
const PAPER_FIELDS = "title,abstract,year,authors,citationCount,influentialCitationCount,isOpenAccess,url,externalIds";
const RETRY_DELAYS = [1100, 2500, 6000];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return cors(null, 204);

    const url = new URL(request.url);

    if (url.pathname.endsWith("/health")) {
      return cors(JSON.stringify({ status: "ok", plugin: "semantic-scholar", version: "2.1.0" }), 200);
    }

    if (request.method !== "POST") {
      return cors(JSON.stringify({ error: "Method not allowed" }), 405);
    }

    if (url.pathname !== "/invoke" && url.pathname !== "/") {
      return cors(JSON.stringify({ error: "Not found" }), 404);
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
      return cors(JSON.stringify({ error: "Unauthorized" }), 401);
    }

    let body: {
      query?: string;
      fields?: string[];
      limit?: number;
      year_filter?: string;
      min_citations?: number;
      include_recommendations?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return cors(JSON.stringify({ error: "Invalid JSON" }), 400);
    }

    const {
      query,
      fields = ["title", "abstract", "authors", "year", "citationCount", "influentialCitationCount", "isOpenAccess", "url"],
      limit = 10,
      year_filter,
      min_citations,
      include_recommendations = true,
    } = body;

    if (!query || typeof query !== "string") {
      return cors(JSON.stringify({ error: "Missing required field: query" }), 400);
    }

    const apiHeaders = buildHeaders(env);

    // --- Academic Graph: paper search ---
    const searchParams = new URLSearchParams({
      query,
      fields: fields.join(","),
      limit: String(Math.min(limit, 100)),
    });
    if (year_filter) searchParams.set("year", year_filter);
    if (min_citations) searchParams.set("minCitationCount", String(min_citations));

    const searchUrl = `${GRAPH_BASE}/paper/search?${searchParams}`;
    const searchRes = await fetchWithRetry(searchUrl, { method: "GET", headers: apiHeaders });

    if (!searchRes.ok) {
      const errText = await searchRes.text().catch(() => "");
      console.error(`Semantic Scholar search ${searchRes.status}:`, errText);
      return cors(JSON.stringify({ error: `Semantic Scholar API error: ${searchRes.status}` }), 502);
    }

    const searchData = (await searchRes.json()) as { total: number; data: PaperRaw[] };
    const searchPapers = normalisePapers(searchData.data ?? [], "search");

    // --- Recommendations API: seed with top paper IDs ---
    let recPapers: NormalisedPaper[] = [];
    if (include_recommendations && searchPapers.length >= 2) await new Promise((r) => setTimeout(r, 1100));
    if (include_recommendations && searchPapers.length >= 2) {
      const seedIds = searchPapers
        .slice(0, 3)
        .map((p) => p.paper_id)
        .filter(Boolean) as string[];

      if (seedIds.length > 0) {
        const recUrl = `${RECS_BASE}/papers/?fields=${PAPER_FIELDS}&limit=8`;
        const recRes = await fetchWithRetry(recUrl, {
          method: "POST",
          headers: { ...apiHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ positivePaperIds: seedIds }),
        });

        if (recRes.ok) {
          const recData = (await recRes.json()) as { recommendedPapers: PaperRaw[] };
          recPapers = normalisePapers(recData.recommendedPapers ?? [], "recommendation");
        } else {
          // Recommendations failure is non-fatal — log and continue with search results only
          console.warn(`Recommendations API ${recRes.status} — falling back to search results only`);
        }
      }
    }

    // Deduplicate by paper_id (search results take priority)
    const seen = new Set(searchPapers.map((p) => p.paper_id).filter(Boolean));
    const uniqueRecs = recPapers.filter((p) => !seen.has(p.paper_id));
    const combined = [...searchPapers, ...uniqueRecs];

    return cors(
      JSON.stringify({
        papers: combined,
        total: searchData.total,
        search_count: searchPapers.length,
        recommendation_count: uniqueRecs.length,
        source: "semantic-scholar",
      }),
      200,
    );
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PaperRaw {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  authors?: { name: string }[];
  citationCount?: number;
  influentialCitationCount?: number;
  isOpenAccess?: boolean;
  url?: string;
  externalIds?: { DOI?: string; ArXiv?: string };
}

interface NormalisedPaper {
  paper_id: string | undefined;
  title: string;
  abstract: string;
  year: number | null;
  authors: string[];
  citation_count: number;
  influential_citation_count: number;
  is_open_access: boolean;
  url: string;
  doi: string | null;
  arxiv_id: string | null;
  result_type: "search" | "recommendation";
}

function normalisePapers(raw: PaperRaw[], resultType: "search" | "recommendation"): NormalisedPaper[] {
  return raw.map((p) => ({
    paper_id: p.paperId,
    title: p.title ?? "",
    abstract: p.abstract ?? "",
    year: p.year ?? null,
    authors: (p.authors ?? []).map((a) => a.name),
    citation_count: p.citationCount ?? 0,
    influential_citation_count: p.influentialCitationCount ?? 0,
    is_open_access: p.isOpenAccess ?? false,
    url: p.url ?? (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ""),
    doi: p.externalIds?.DOI ?? null,
    arxiv_id: p.externalIds?.ArXiv ?? null,
    result_type: resultType,
  }));
}

function buildHeaders(env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "SwarmSpace/2.1 (orbital.ai; plugins@orbital.ai)",
    Accept: "application/json",
  };
  if (env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = env.SEMANTIC_SCHOLAR_API_KEY;
  return headers;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let response!: Response;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      response = await fetch(url, init);
    } catch (err) {
      throw new Error(`Network error: ${(err as Error).message}`);
    }
    if (response.status !== 429) break;
    if (attempt < RETRY_DELAYS.length) {
      console.warn(`429 from ${url} — retry ${attempt + 1} in ${RETRY_DELAYS[attempt]}ms`);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
    }
  }
  return response;
}

function cors(body: string | null, status: number): Response {
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
