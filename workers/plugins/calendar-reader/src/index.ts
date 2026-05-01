export interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
  // No other secrets — the OAuth token comes in as a param from LUMARA
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

interface GoogleCalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarAttendee {
  email?: string;
  displayName?: string;
  organizer?: boolean;
  self?: boolean;
  responseStatus?: string;
}

interface GoogleCalendarOrganizer {
  email?: string;
  displayName?: string;
  self?: boolean;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
  attendees?: GoogleCalendarAttendee[];
  organizer?: GoogleCalendarOrganizer;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
}

interface MappedAttendee {
  name: string | null;
  email: string;
  is_organizer: boolean;
}

interface MappedEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location: string | null;
  video_link: string | null;
  attendees: MappedAttendee[];
}

const VIDEO_LINK_REGEX = /https?:\/\/[^\s<>"']*(?:meet\.google\.com|zoom\.us\/j\/|teams\.microsoft\.com)[^\s<>"']*/i;

function extractVideoLink(location: string | undefined, description: string | undefined): string | null {
  const haystack = `${location ?? ""}\n${description ?? ""}`;
  const match = haystack.match(VIDEO_LINK_REGEX);
  return match ? match[0] : null;
}

function getEventTime(slot: GoogleCalendarEventDateTime | undefined): string {
  if (!slot) return "";
  return slot.dateTime || slot.date || "";
}

function computeDurationMinutes(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const startMs = Date.parse(startStr);
  const endMs = Date.parse(endStr);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  const diffMs = endMs - startMs;
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 60000);
}

function mapAttendees(
  event: GoogleCalendarEvent,
): MappedAttendee[] {
  const organizerEmail = event.organizer?.email;
  const list = event.attendees ?? [];
  return list
    .filter((a) => typeof a.email === "string" && a.email.length > 0)
    .map((a) => ({
      name: a.displayName ?? null,
      email: a.email as string,
      is_organizer:
        a.organizer === true ||
        (organizerEmail !== undefined && organizerEmail === a.email),
    }));
}

function mapEvent(event: GoogleCalendarEvent): MappedEvent {
  const startTime = getEventTime(event.start);
  const endTime = getEventTime(event.end);
  return {
    id: event.id ?? "",
    title: event.summary ?? "",
    start_time: startTime,
    end_time: endTime,
    duration_minutes: computeDurationMinutes(startTime, endTime),
    location: event.location ?? null,
    video_link: extractVideoLink(event.location, event.description),
    attendees: mapAttendees(event),
  };
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

      let body: { access_token?: string; lookahead_hours?: number; max_events?: number };
      try {
        body = (await request.json()) as {
          access_token?: string;
          lookahead_hours?: number;
          max_events?: number;
        };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const accessToken = body.access_token;
      if (!accessToken) {
        return jsonResponse({ error: "Missing required parameter: access_token" }, 400);
      }

      const lookaheadHours =
        typeof body.lookahead_hours === "number" && body.lookahead_hours > 0
          ? body.lookahead_hours
          : 24;
      const maxEvents =
        typeof body.max_events === "number" && body.max_events > 0
          ? body.max_events
          : 5;

      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + lookaheadHours * 3600 * 1000).toISOString();

      const params = new URLSearchParams({
        orderBy: "startTime",
        singleEvents: "true",
        timeMin,
        timeMax,
        maxResults: String(maxEvents),
      });

      const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;

      let apiResponse: Response;
      try {
        apiResponse = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        return jsonResponse(
          { error: `Calendar API request failed: ${(err as Error).message}` },
          502,
        );
      }

      if (apiResponse.status === 401) {
        return jsonResponse({ error: "calendar_auth_expired" }, 401);
      }

      if (!apiResponse.ok) {
        return jsonResponse(
          { error: `Google Calendar API error: ${apiResponse.status}` },
          apiResponse.status,
        );
      }

      const data = (await apiResponse.json()) as GoogleCalendarListResponse;
      const items = Array.isArray(data.items) ? data.items : [];
      const events = items.map(mapEvent);

      return jsonResponse({
        results: events,
        source: "calendar-reader",
        count: events.length,
      });
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};
