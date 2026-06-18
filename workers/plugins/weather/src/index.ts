interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
}

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Rain showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  99: "Thunderstorm with hail",
};

function wmoDescription(code: number): string {
  return WMO_CODES[code] ?? "Unknown";
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

      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.searchParams.set("name", query);
      geoUrl.searchParams.set("count", "1");
      geoUrl.searchParams.set("language", "en");
      geoUrl.searchParams.set("format", "json");

      const geoRes = await fetch(geoUrl.toString(), {
        signal: AbortSignal.timeout(15_000),
      });

      if (!geoRes.ok) {
        return corsResponse(
          JSON.stringify({ error: `Geocoding API error: ${geoRes.status}`, source: "weather" }),
          502,
        );
      }

      const geoData = (await geoRes.json()) as { results?: Array<{ name: string; latitude: number; longitude: number; timezone: string }> };

      if (!geoData.results || geoData.results.length === 0) {
        return corsResponse(JSON.stringify({ error: "Location not found", source: "weather" }), 200);
      }

      const place = geoData.results[0];

      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.searchParams.set("latitude", String(place.latitude));
      forecastUrl.searchParams.set("longitude", String(place.longitude));
      forecastUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,precipitation");
      forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code");
      forecastUrl.searchParams.set("timezone", "auto");
      forecastUrl.searchParams.set("forecast_days", "3");

      const forecastRes = await fetch(forecastUrl.toString(), {
        signal: AbortSignal.timeout(15_000),
      });

      if (!forecastRes.ok) {
        return corsResponse(
          JSON.stringify({ error: `Weather API error: ${forecastRes.status}`, source: "weather" }),
          502,
        );
      }

      const forecast = (await forecastRes.json()) as {
        current: {
          temperature_2m: number;
          apparent_temperature: number;
          weather_code: number;
          wind_speed_10m: number;
          relative_humidity_2m: number;
          precipitation: number;
        };
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: number[];
          weather_code: number[];
        };
      };

      const result = {
        location: {
          name: place.name,
          lat: place.latitude,
          lon: place.longitude,
          timezone: place.timezone,
        },
        current: {
          temperature_c: forecast.current.temperature_2m,
          feels_like_c: forecast.current.apparent_temperature,
          humidity_pct: forecast.current.relative_humidity_2m,
          wind_kph: forecast.current.wind_speed_10m,
          precipitation_mm: forecast.current.precipitation,
          condition: wmoDescription(forecast.current.weather_code),
        },
        forecast: forecast.daily.time.map((date, i) => ({
          date,
          max_c: forecast.daily.temperature_2m_max[i],
          min_c: forecast.daily.temperature_2m_min[i],
          precipitation_mm: forecast.daily.precipitation_sum[i],
          condition: wmoDescription(forecast.daily.weather_code[i]),
        })),
        source: "weather",
        provider: "open-meteo.com",
      };

      return corsResponse(JSON.stringify(result), 200);
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
