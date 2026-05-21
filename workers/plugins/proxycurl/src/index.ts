export interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  PROXYCURL_API_KEY: string;
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

interface ProxycurlProfile {
  full_name?: string;
  headline?: string;
  summary?: string;
  occupation?: string;
  experiences?: Array<{ company: string; title: string; description?: string }>;
  education?: Array<{ degree_name: string; school: string }>;
  skills?: string[];
  city?: string;
  country_full_name?: string;
  linkedin_url?: string;
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

      let body: { linkedin_url?: string; name?: string; company?: string };
      try {
        body = (await request.json()) as { linkedin_url?: string; name?: string; company?: string };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      if (!body.linkedin_url && !(body.name && body.company)) {
        return jsonResponse(
          { error: "Missing required parameter: linkedin_url or name+company" },
          400,
        );
      }

      let apiUrl: string;
      if (body.linkedin_url) {
        apiUrl = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(body.linkedin_url)}&use_cache=if-present`;
      } else {
        const parts = body.name!.split(" ");
        const firstName = parts[0];
        const lastName = parts.slice(1).join(" ");
        apiUrl = `https://nubela.co/proxycurl/api/v2/linkedin/profile/resolve?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&company_domain=${encodeURIComponent(body.company!)}&similarity_checks=include`;
      }

      try {
        const apiResponse = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${env.PROXYCURL_API_KEY}` },
          signal: AbortSignal.timeout(15_000),
        });

        if (apiResponse.status === 404) {
          return jsonResponse({ error: "profile_not_found" }, 404);
        }
        if (apiResponse.status === 402) {
          return jsonResponse({ error: "proxycurl_quota_exceeded" }, 402);
        }
        if (!apiResponse.ok) {
          return jsonResponse(
            { error: `proxycurl_error: ${apiResponse.status}` },
            502,
          );
        }

        const data = (await apiResponse.json()) as ProxycurlProfile;

        const experiences = (data.experiences || []).slice(0, 3);
        const education = (data.education || []).slice(0, 2);
        const skills = (data.skills || []).slice(0, 8);

        const lines: string[] = [];
        lines.push(`${data.full_name || "Unknown"} — ${data.headline || ""}`);
        if (data.occupation && experiences[0]?.company) {
          lines.push(`Current: ${data.occupation} at ${experiences[0].company}`);
        }
        if (data.city || data.country_full_name) {
          const locationParts: string[] = [];
          if (data.city) locationParts.push(data.city);
          if (data.country_full_name) locationParts.push(data.country_full_name);
          lines.push(`Location: ${locationParts.join(", ")}`);
        }
        if (data.summary) {
          lines.push(`\nBio: ${data.summary.slice(0, 400)}`);
        }
        if (experiences.length > 0) {
          lines.push(`\nRecent roles:`);
          for (const exp of experiences) {
            lines.push(`- ${exp.title} at ${exp.company}`);
          }
        }
        if (education.length > 0) {
          lines.push(
            `\nEducation: ${education.map((e) => `${e.degree_name} · ${e.school}`).join(", ")}`,
          );
        }
        if (skills.length > 0) {
          lines.push(`\nSkills: ${skills.join(", ")}`);
        }

        const textBlock = lines.join("\n");

        return jsonResponse({
          results: [
            {
              content: textBlock,
              source_url: data.linkedin_url || body.linkedin_url || "",
            },
          ],
          source: "proxycurl",
          count: 1,
        });
      } catch {
        return jsonResponse({ error: "proxycurl_error: network" }, 502);
      }
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};
