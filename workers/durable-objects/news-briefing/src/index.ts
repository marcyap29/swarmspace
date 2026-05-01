// SwarmSpace News Briefing Durable Object (v1, API-only)
//
// Implements §5.2 of backlog.md. A persistent recurring agent that wraps the
// orchestrator's `/news-brief` route. On a daily/weekly cadence, the DO calls
// the orchestrator, diffs the new output against the previous run, and stores
// the delta. LUMARA (or any client) can fetch the latest delta via the
// `GET /durable-objects/news-briefing/{do_id}/latest` route.
//
// Architectural decisions (locked):
//   - Lives in its own Worker (not inside the orchestrator).
//   - Calls orchestrator via HTTP using a service-token bypass; Lead is
//     adding the matching auth path on the orchestrator + swarmspaceRouter
//     side in parallel.
//   - Tier gate: Worker reads `users/{uid}.plan` from Firestore via REST API
//     at create time. Free → reject. Pro/Premium → pass.
//   - Firebase ID token validation via Firebase Auth REST API against
//     project id `arc-epi`.
//   - v1 = API-only. No UI. LUMARA wires UI later.

import { DurableObject } from "cloudflare:workers";

// ── Env ──────────────────────────────────────────────────────────────────────

export interface Env {
  // Bindings
  NEWS_BRIEFING: DurableObjectNamespace;

  // Vars
  FIREBASE_PROJECT_ID: string;
  ORCHESTRATOR_URL: string;

  // Secrets
  SWARMSPACE_INTERNAL_TOKEN: string;
  FIREBASE_API_KEY: string;
  FIRESTORE_SERVICE_ACCOUNT_JSON: string;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

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

// ── Firebase auth helpers ────────────────────────────────────────────────────

async function verifyFirebaseToken(
  idToken: string,
  apiKey: string,
): Promise<{ uid: string } | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: Array<{ localId: string }> };
  const uid = data.users?.[0]?.localId;
  return uid ? { uid } : null;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

// ── Firestore tier gate via service-account OAuth ────────────────────────────
//
// Standard Google service-account flow:
//   1. Build a JWT { iss, scope, aud, exp, iat } and sign RS256 with the
//      service account private key.
//   2. POST to https://oauth2.googleapis.com/token with
//      grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<jwt>.
//   3. Use the returned access_token as `Authorization: Bearer <token>` on
//      Firestore REST GET.

interface ServiceAccountJSON {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function base64UrlEncode(input: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function decodeServiceAccountJSON(b64: string): ServiceAccountJSON {
  // Accept either a base64-encoded JSON blob or a raw JSON string.
  let raw = b64;
  if (!raw.trim().startsWith("{")) {
    try {
      raw = atob(b64);
    } catch {
      // fall through; will fail on JSON.parse
    }
  }
  const sa = JSON.parse(raw) as ServiceAccountJSON;
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Invalid service account JSON: missing client_email or private_key");
  }
  return sa;
}

async function mintFirestoreAccessToken(saJsonB64: string): Promise<string> {
  const sa = decodeServiceAccountJSON(saJsonB64);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const encodedSignature = base64UrlEncode(signatureBuf);
  const jwt = `${signingInput}.${encodedSignature}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Token exchange returned no access_token");
  return data.access_token;
}

async function getUserPlan(uid: string, env: Env): Promise<string> {
  // Returns 'free' | 'pro' | 'premium' (or 'free' if missing).
  // Reads users/{uid}.plan from Firestore via REST.
  try {
    const accessToken = await mintFirestoreAccessToken(env.FIRESTORE_SERVICE_ACCOUNT_JSON);
    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) return "free";
    if (!res.ok) {
      const text = await res.text();
      console.error(`Firestore GET failed (${res.status}): ${text}`);
      return "free";
    }
    const data = (await res.json()) as {
      fields?: { plan?: { stringValue?: string } };
    };
    return data.fields?.plan?.stringValue || "free";
  } catch (err) {
    console.error("getUserPlan error:", (err as Error).message);
    // Fail closed: if we cannot determine plan, treat as free.
    return "free";
  }
}

function isPaidTier(plan: string): boolean {
  const p = plan.toLowerCase();
  return p === "pro" || p === "premium";
}

// ── Worker fetch handler ─────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Auth: every route requires a Firebase ID token.
    const idToken = extractBearerToken(request.headers.get("Authorization"));
    if (!idToken) {
      return jsonResponse({ error: "Missing Authorization: Bearer <id_token>" }, 401);
    }
    const verified = await verifyFirebaseToken(idToken, env.FIREBASE_API_KEY);
    if (!verified) {
      return jsonResponse({ error: "invalid_token" }, 401);
    }
    const uid = verified.uid;

    // POST /durable-objects/news-briefing/create
    if (request.method === "POST" && path === "/durable-objects/news-briefing/create") {
      return handleCreate(request, env, uid);
    }

    // POST /durable-objects/news-briefing/cancel
    if (request.method === "POST" && path === "/durable-objects/news-briefing/cancel") {
      return handleCancel(request, env, uid);
    }

    // GET /durable-objects/news-briefing/{do_id}/latest
    const latestMatch = path.match(/^\/durable-objects\/news-briefing\/([^/]+)\/latest\/?$/);
    if (request.method === "GET" && latestMatch) {
      return handleLatest(latestMatch[1], env, uid);
    }

    return jsonResponse(
      {
        error: "Not Found",
        routes: [
          "POST /durable-objects/news-briefing/create",
          "POST /durable-objects/news-briefing/cancel",
          "GET /durable-objects/news-briefing/{do_id}/latest",
        ],
      },
      404,
    );
  },
};

// ── Route handlers ───────────────────────────────────────────────────────────

async function handleCreate(request: Request, env: Env, uid: string): Promise<Response> {
  let body: { topics?: unknown; cadence?: unknown };
  try {
    body = (await request.json()) as { topics?: unknown; cadence?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Validate topics: non-empty array of non-empty strings.
  if (
    !Array.isArray(body.topics) ||
    body.topics.length === 0 ||
    !body.topics.every((t) => typeof t === "string" && t.trim().length > 0)
  ) {
    return jsonResponse(
      { error: "topics must be a non-empty array of strings" },
      400,
    );
  }
  const topics = body.topics as string[];

  // Validate cadence.
  if (body.cadence !== "daily" && body.cadence !== "weekly") {
    return jsonResponse(
      { error: 'cadence must be "daily" or "weekly"' },
      400,
    );
  }
  const cadence = body.cadence;

  // Tier gate.
  const plan = await getUserPlan(uid, env);
  if (!isPaidTier(plan)) {
    return jsonResponse({ error: "paid_tier_required" }, 403);
  }

  // Spawn DO.
  const id = env.NEWS_BRIEFING.newUniqueId();
  const stub = env.NEWS_BRIEFING.get(id);
  const initRes = await stub.fetch(
    new Request("https://internal/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topics,
        cadence,
        owner_uid: uid,
        tier: plan,
      }),
    }),
  );
  if (!initRes.ok) {
    const text = await initRes.text();
    return jsonResponse(
      { error: "do_init_failed", detail: text },
      500,
    );
  }

  return jsonResponse({ do_id: id.toString() }, 200);
}

async function handleCancel(request: Request, env: Env, uid: string): Promise<Response> {
  let body: { do_id?: unknown };
  try {
    body = (await request.json()) as { do_id?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (typeof body.do_id !== "string" || body.do_id.length === 0) {
    return jsonResponse({ error: "do_id is required" }, 400);
  }

  let id: DurableObjectId;
  try {
    id = env.NEWS_BRIEFING.idFromString(body.do_id);
  } catch {
    return jsonResponse({ error: "invalid_do_id" }, 400);
  }
  const stub = env.NEWS_BRIEFING.get(id);
  const res = await stub.fetch(
    new Request("https://internal/cancel", {
      method: "POST",
      headers: { "X-User-Uid": uid },
    }),
  );
  // Proxy DO response.
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function handleLatest(doIdStr: string, env: Env, uid: string): Promise<Response> {
  let id: DurableObjectId;
  try {
    id = env.NEWS_BRIEFING.idFromString(doIdStr);
  } catch {
    return jsonResponse({ error: "invalid_do_id" }, 400);
  }
  const stub = env.NEWS_BRIEFING.get(id);
  const res = await stub.fetch(
    new Request("https://internal/latest", {
      method: "GET",
      headers: { "X-User-Uid": uid },
    }),
  );
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ── Durable Object ───────────────────────────────────────────────────────────

export class NewsBriefingDO extends DurableObject<Env> {
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private ensureSchema(): void {
    if (this.initialized) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.initialized = true;
  }

  private getState(key: string): string | null {
    this.ensureSchema();
    const cursor = this.ctx.storage.sql.exec<{ value: string }>(
      "SELECT value FROM state WHERE key = ?",
      key,
    );
    for (const row of cursor) {
      return row.value;
    }
    return null;
  }

  private setState(key: string, value: string): void {
    this.ensureSchema();
    this.ctx.storage.sql.exec(
      "INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/init") {
      return this.handleInit(request);
    }

    if (request.method === "POST" && path === "/cancel") {
      return this.handleCancel(request);
    }

    if (request.method === "GET" && path === "/latest") {
      return this.handleLatest(request);
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleInit(request: Request): Promise<Response> {
    let body: {
      topics?: string[];
      cadence?: "daily" | "weekly";
      owner_uid?: string;
      tier?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      !body.topics ||
      !Array.isArray(body.topics) ||
      body.topics.length === 0 ||
      !body.cadence ||
      !body.owner_uid
    ) {
      return new Response(JSON.stringify({ error: "missing required init fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    this.ensureSchema();
    this.setState("topics", JSON.stringify(body.topics));
    this.setState("cadence", body.cadence);
    this.setState("owner_uid", body.owner_uid);
    this.setState("tier_at_creation", body.tier || "unknown");
    this.setState("created_at", new Date().toISOString());

    // First alarm: 1 minute from now (v1 testing convenience).
    // PRODUCTION TODO: schedule to next natural cadence boundary
    // (e.g., next 06:00 local user time for daily; next Monday 06:00 for weekly).
    await this.ctx.storage.setAlarm(Date.now() + 60_000);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleCancel(request: Request): Promise<Response> {
    const requesterUid = request.headers.get("X-User-Uid");
    const ownerUid = this.getState("owner_uid");
    if (!requesterUid || !ownerUid || requesterUid !== ownerUid) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    await this.ctx.storage.deleteAlarm();
    this.setState("cancelled_at", new Date().toISOString());

    return new Response(JSON.stringify({ ok: true, cancelled: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleLatest(request: Request): Promise<Response> {
    const requesterUid = request.headers.get("X-User-Uid");
    const ownerUid = this.getState("owner_uid");
    if (!requesterUid || !ownerUid || requesterUid !== ownerUid) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const latestDeltaJson = this.getState("latest_delta_json");
    const lastRunAt = this.getState("last_run_at");
    const cadence = this.getState("cadence");

    let latestDelta: unknown = null;
    if (latestDeltaJson) {
      try {
        latestDelta = JSON.parse(latestDeltaJson);
      } catch {
        latestDelta = null;
      }
    }

    return new Response(
      JSON.stringify({
        latest_delta: latestDelta,
        last_run_at: lastRunAt,
        cadence,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  async alarm(): Promise<void> {
    this.ensureSchema();
    const topicsJson = this.getState("topics");
    const ownerUid = this.getState("owner_uid");
    const cadence = this.getState("cadence");
    const cancelledAt = this.getState("cancelled_at");

    if (cancelledAt) {
      // Was cancelled; do nothing further.
      return;
    }

    if (!topicsJson || !ownerUid || !cadence) {
      console.error("alarm: missing state, skipping");
      this.scheduleNext(cadence || "daily");
      return;
    }

    let topics: string[];
    try {
      topics = JSON.parse(topicsJson) as string[];
    } catch {
      console.error("alarm: failed to parse topics");
      this.scheduleNext(cadence);
      return;
    }
    const query = topics.join(" ");

    let newOutput: unknown = null;
    try {
      const orchestratorRes = await fetch(`${this.env.ORCHESTRATOR_URL}/news-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.SWARMSPACE_INTERNAL_TOKEN}`,
        },
        body: JSON.stringify({
          query,
          _service_token: this.env.SWARMSPACE_INTERNAL_TOKEN,
          _run_as_uid: ownerUid,
        }),
      });
      if (!orchestratorRes.ok) {
        const text = await orchestratorRes.text();
        console.error(`alarm: orchestrator error ${orchestratorRes.status}: ${text}`);
      } else {
        const json = (await orchestratorRes.json()) as {
          workflow?: string;
          result?: unknown;
        };
        // Orchestrator shape: { workflow: "/news-brief", result: { ... } }
        // The interesting payload lives at result.<some shape>.
        newOutput = json.result ?? null;
      }
    } catch (err) {
      console.error("alarm: orchestrator fetch threw:", (err as Error).message);
    }

    // Compute delta vs previous output and persist.
    if (newOutput !== null) {
      const previousJson = this.getState("previous_output_json");
      let previousOutput: unknown = null;
      if (previousJson) {
        try {
          previousOutput = JSON.parse(previousJson);
        } catch {
          previousOutput = null;
        }
      }

      const delta = computeDelta(previousOutput, newOutput);

      this.setState("previous_output_json", JSON.stringify(newOutput));
      this.setState("latest_delta_json", JSON.stringify(delta));
      this.setState("last_run_at", new Date().toISOString());
    }

    this.scheduleNext(cadence);
  }

  private scheduleNext(cadence: string): void {
    const now = Date.now();
    const next =
      cadence === "weekly"
        ? now + 7 * 24 * 60 * 60 * 1000
        : now + 24 * 60 * 60 * 1000;
    void this.ctx.storage.setAlarm(next);
  }
}

// ── Diff logic ───────────────────────────────────────────────────────────────

interface Delta {
  new_items: unknown[];
  total_new: number;
  total_in_briefing: number;
}

function extractItems(output: unknown): unknown[] | null {
  if (!output || typeof output !== "object") return null;
  const obj = output as Record<string, unknown>;
  // Try fields in order.
  for (const field of ["articles", "items", "top_stories"]) {
    const v = obj[field];
    if (Array.isArray(v)) return v;
  }
  // Recurse one level: orchestrator shape may be { sources: {...}, brief: {...} }
  // and the items might be inside brief or sources.news.
  if (obj.brief && typeof obj.brief === "object") {
    const found = extractItems(obj.brief);
    if (found) return found;
  }
  if (obj.sources && typeof obj.sources === "object") {
    const sources = obj.sources as Record<string, unknown>;
    for (const sourceKey of Object.keys(sources)) {
      const found = extractItems(sources[sourceKey]);
      if (found) return found;
    }
  }
  return null;
}

function itemKey(item: unknown): string {
  if (!item || typeof item !== "object") return JSON.stringify(item);
  const obj = item as Record<string, unknown>;
  if (typeof obj.url === "string") return `url:${obj.url}`;
  if (typeof obj.id === "string" || typeof obj.id === "number") return `id:${obj.id}`;
  if (typeof obj.title === "string") return `title:${obj.title}`;
  return JSON.stringify(item);
}

function computeDelta(oldOutput: unknown, newOutput: unknown): Delta {
  const newItems = extractItems(newOutput);

  // Fallback: stringified comparison when items can't be extracted.
  if (!newItems) {
    const newStr = JSON.stringify(newOutput);
    const oldStr = oldOutput ? JSON.stringify(oldOutput) : "";
    if (newStr === oldStr) {
      return { new_items: [], total_new: 0, total_in_briefing: 0 };
    }
    return {
      new_items: [{ raw: newOutput }],
      total_new: 1,
      total_in_briefing: 1,
    };
  }

  const oldItems = oldOutput ? extractItems(oldOutput) : null;
  if (!oldItems || oldItems.length === 0) {
    // First run (or unparseable old): everything is new.
    return {
      new_items: newItems,
      total_new: newItems.length,
      total_in_briefing: newItems.length,
    };
  }

  const oldKeys = new Set(oldItems.map(itemKey));
  const newOnes = newItems.filter((it) => !oldKeys.has(itemKey(it)));
  return {
    new_items: newOnes,
    total_new: newOnes.length,
    total_in_briefing: newItems.length,
  };
}
