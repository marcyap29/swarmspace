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

      const limit = Math.min(Math.max(body.limit ?? 5, 1), 20);

      const apiUrl = new URL("https://export.arxiv.org/api/query");
      apiUrl.searchParams.set("search_query", `all:${query}`);
      apiUrl.searchParams.set("start", "0");
      apiUrl.searchParams.set("max_results", String(limit));
      apiUrl.searchParams.set("sortBy", "submittedDate");
      apiUrl.searchParams.set("sortOrder", "descending");

      const res = await fetch(apiUrl.toString(), {
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return corsResponse(
          JSON.stringify({ error: `arXiv API error: ${res.status}` }),
          502,
        );
      }

      const xml = await res.text();
      const results = parseAtomEntries(xml);

      return corsResponse(JSON.stringify({ results, source: "arxiv", count: results.length }), 200);
    }

    return corsResponse(JSON.stringify({ error: "Not found" }), 404);
  },
};

function parseAtomEntries(
  xml: string,
): Array<{
  title: string;
  summary: string;
  url: string;
  published: string;
  authors: string[];
}> {
  const entries: Array<{
    title: string;
    summary: string;
    url: string;
    published: string;
    authors: string[];
  }> = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1];

    const title = extractTag(block, "title").replace(/\s+/g, " ").trim();
    const summary = extractTag(block, "summary").replace(/\s+/g, " ").trim();
    const url = extractTag(block, "id").trim();
    const published = extractTag(block, "published").trim();

    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/g;
    let authorMatch: RegExpExecArray | null;
    while ((authorMatch = authorRegex.exec(block)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    entries.push({ title, summary, url, published, authors });
  }

  return entries;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1] : "";
}

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
