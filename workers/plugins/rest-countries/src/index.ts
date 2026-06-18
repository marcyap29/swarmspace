interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
}

// Common country name → ISO2 code lookup (covers ~95% of queries)
const COUNTRY_MAP: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "argentina": "AR",
  "australia": "AU", "austria": "AT", "bangladesh": "BD", "belgium": "BE",
  "bolivia": "BO", "brazil": "BR", "cambodia": "KH", "canada": "CA",
  "chile": "CL", "china": "CN", "colombia": "CO", "croatia": "HR",
  "czech republic": "CZ", "czechia": "CZ", "denmark": "DK", "ecuador": "EC",
  "egypt": "EG", "ethiopia": "ET", "finland": "FI", "france": "FR",
  "germany": "DE", "ghana": "GH", "greece": "GR", "guatemala": "GT",
  "hong kong": "HK", "hungary": "HU", "india": "IN", "indonesia": "ID",
  "iran": "IR", "iraq": "IQ", "ireland": "IE", "israel": "IL",
  "italy": "IT", "jamaica": "JM", "japan": "JP", "jordan": "JO",
  "kazakhstan": "KZ", "kenya": "KE", "south korea": "KR", "korea": "KR",
  "kuwait": "KW", "laos": "LA", "latvia": "LV", "lebanon": "LB",
  "libya": "LY", "lithuania": "LT", "malaysia": "MY", "mexico": "MX",
  "morocco": "MA", "myanmar": "MM", "nepal": "NP", "netherlands": "NL",
  "new zealand": "NZ", "nigeria": "NG", "norway": "NO", "pakistan": "PK",
  "panama": "PA", "paraguay": "PY", "peru": "PE", "philippines": "PH",
  "poland": "PL", "portugal": "PT", "qatar": "QA", "romania": "RO",
  "russia": "RU", "russian federation": "RU", "saudi arabia": "SA",
  "senegal": "SN", "singapore": "SG", "slovakia": "SK", "slovenia": "SI",
  "south africa": "ZA", "spain": "ES", "sri lanka": "LK", "sweden": "SE",
  "switzerland": "CH", "taiwan": "TW", "tanzania": "TZ", "thailand": "TH",
  "turkey": "TR", "turkiye": "TR", "ukraine": "UA", "united arab emirates": "AE",
  "uae": "AE", "united kingdom": "GB", "uk": "GB", "great britain": "GB",
  "england": "GB", "scotland": "GB", "wales": "GB",
  "united states": "US", "usa": "US", "us": "US", "america": "US",
  "uruguay": "UY", "uzbekistan": "UZ", "venezuela": "VE", "vietnam": "VN",
  "yemen": "YE", "zimbabwe": "ZW", "iceland": "IS", "bulgaria": "BG",
  "myanmar (burma)": "MM", "burma": "MM", "côte d'ivoire": "CI",
  "ivory coast": "CI", "democratic republic of the congo": "CD",
  "republic of the congo": "CG", "north korea": "KP", "north macedonia": "MK",
  "papua new guinea": "PG", "puerto rico": "PR", "costa rica": "CR",
  "dominican republic": "DO", "el salvador": "SV", "honduras": "HN",
  "nicaragua": "NI", "cuba": "CU", "haiti": "HT", "trinidad and tobago": "TT",
  "bahrain": "BH", "oman": "OM", "cyprus": "CY", "malta": "MT",
  "luxembourg": "LU", "estonia": "EE", "belarus": "BY", "moldova": "MD",
  "georgia": "GE", "armenia": "AM", "azerbaijan": "AZ",
  "new caledonia": "NC", "fiji": "FJ", "cambodia": "KH",
};

function resolveIso2(query: string): string | null {
  const q = query.toLowerCase().trim();
  // direct match
  if (COUNTRY_MAP[q]) return COUNTRY_MAP[q];
  // partial match — query contains a country name
  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (q.includes(name)) return code;
  }
  return null;
}

interface WorldBankCountry {
  name?: string;
  iso2Code?: string;
  capitalCity?: string;
  region?: { value?: string };
  incomeLevel?: { value?: string };
  longitude?: string;
  latitude?: string;
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

      let body: { query?: string };
      try {
        body = await request.json();
      } catch {
        return corsResponse(JSON.stringify({ error: "Invalid JSON body" }), 400);
      }

      const query = body.query;
      if (!query) {
        return corsResponse(JSON.stringify({ error: "Missing required field: query" }), 400);
      }

      const iso2 = resolveIso2(query);
      if (!iso2) {
        return corsResponse(
          JSON.stringify({ results: [], source: "rest-countries", count: 0 }),
          200,
        );
      }

      const apiUrl = `https://api.worldbank.org/v2/country/${iso2}?format=json`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        return corsResponse(
          JSON.stringify({ error: `Country API error: ${res.status}` }),
          502,
        );
      }

      const raw: unknown = await res.json().catch(() => null);
      if (!raw || !Array.isArray(raw) || !Array.isArray(raw[1])) {
        return corsResponse(
          JSON.stringify({ results: [], source: "rest-countries", count: 0 }),
          200,
        );
      }

      const countries = raw[1] as WorldBankCountry[];
      const results = countries
        .filter((c) => c.iso2Code && c.iso2Code.length === 2)
        .map((c) => ({
          name: c.name ?? "",
          iso2: c.iso2Code ?? "",
          capital: c.capitalCity ?? "",
          region: c.region?.value ?? "",
          income_level: c.incomeLevel?.value ?? "",
          lat: c.latitude ?? "",
          lon: c.longitude ?? "",
        }));

      return corsResponse(
        JSON.stringify({ results, source: "rest-countries", count: results.length }),
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
