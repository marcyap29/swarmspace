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

      let body: { base?: string };
      try {
        body = await request.json();
      } catch {
        return corsResponse(JSON.stringify({ error: "Invalid JSON body" }), 400);
      }

      const rawBase = body.base ?? "USD";
      const base = rawBase.toUpperCase().length >= 2 && rawBase.toUpperCase().length <= 4
        ? rawBase.toUpperCase()
        : "USD";

      const apiUrl = `https://api.frankfurter.app/latest?base=${base}`;

      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return corsResponse(
          JSON.stringify({ error: `Currency API error: ${res.status}` }),
          502,
        );
      }

      const data = (await res.json()) as { base: string; date: string; rates: Record<string, number> };

      return corsResponse(
        JSON.stringify({
          base: data.base,
          date: data.date,
          rates: data.rates,
          source: "currency",
          provider: "frankfurter.app",
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
