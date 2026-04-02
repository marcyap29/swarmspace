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

      let body: { query?: string };
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

      const apiUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(query)}?fields=name,capital,population,area,region,subregion,languages,currencies,flags`;

      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        if (res.status === 404) {
          return corsResponse(JSON.stringify({ results: [] }), 200);
        }
        return corsResponse(
          JSON.stringify({
            error: `REST Countries API error: ${res.status}`,
          }),
          502,
        );
      }

      const data = (await res.json()) as Array<{
        name: { common: string };
        capital?: string[];
        population: number;
        area: number;
        region: string;
        subregion: string;
        languages?: Record<string, string>;
        currencies?: Record<string, { name: string; symbol: string }>;
        flags?: { png: string; svg: string };
      }>;

      const results = data.map((country) => ({
        name: country.name.common,
        capital: country.capital ?? [],
        population: country.population,
        area: country.area,
        region: country.region,
        subregion: country.subregion,
        languages: country.languages ?? {},
        currencies: country.currencies ?? {},
        flag_url: country.flags?.svg ?? country.flags?.png ?? "",
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
