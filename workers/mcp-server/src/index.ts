import { MCP_TOOLS, toolByName } from "./tools";

interface Env {
  ORCHESTRATOR_URL: string;
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
  MCP_KEY_SECRET: string;
  SWARMSPACE_INTERNAL_TOKEN: string;
  OAUTH_ISSUER: string;
  FIREBASE_PROJECT_ID: string;
  OAUTH_CLIENTS: KVNamespace;
  OAUTH_CODES: KVNamespace;
  OAUTH_TOKENS: KVNamespace;
}

interface OAuthClient {
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
}

interface OAuthCode {
  uid: string;
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  resource: string;
}

interface OAuthTokenRecord {
  uid: string;
  clientId: string;
}

// ── Crypto helpers ──────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(buf));
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(new Uint8Array(sig));
}

async function hmacVerify(secret: string, message: string, sig: string): Promise<boolean> {
  const expected = await hmacSign(secret, message);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ── Legacy HMAC API key validation (migration fallback) ────────────────────

async function validateApiKey(apiKey: string, secret: string): Promise<string | null> {
  if (!apiKey.startsWith("ss_mcp_")) return null;
  const stripped = apiKey.slice("ss_mcp_".length);
  const parts = stripped.split(".");
  if (parts.length !== 3) return null;
  const [uidB64, tsB64, hmacHex] = parts;
  const expected = await hmacSign(secret, `${uidB64}.${tsB64}`);
  if (expected.length !== hmacHex.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ hmacHex.charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    return new TextDecoder().decode(base64UrlDecode(uidB64));
  } catch {
    return null;
  }
}

// ── OAuth token validation ──────────────────────────────────────────────────

// Self-contained signed access token: base64url(payload).hmacHex
// No KV lookup — avoids Cloudflare KV eventual-consistency race between PoPs.
async function issueSignedAccessToken(uid: string, clientId: string, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ uid, cid: clientId, exp })).buffer as ArrayBuffer
  );
  const sig = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

async function validateSignedAccessToken(token: string, secret: string): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!(await hmacVerify(secret, payloadB64, sig))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as {
      uid: string; cid: string; exp: number;
    };
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.uid;
  } catch { return null; }
}

async function validateOAuthToken(token: string, env: Env): Promise<string | null> {
  // Signed tokens (new path — no KV needed)
  const uid = await validateSignedAccessToken(token, env.MCP_KEY_SECRET);
  if (uid) return uid;
  // KV fallback for any tokens issued before this change
  const hash = await sha256Hex(token);
  const stored = await env.OAUTH_TOKENS.get<OAuthTokenRecord>(hash, "json");
  return stored?.uid ?? null;
}

async function getUid(token: string, env: Env): Promise<string | null> {
  if (!token) return null;
  const oauthUid = await validateOAuthToken(token, env);
  if (oauthUid) return oauthUid;
  return validateApiKey(token, env.MCP_KEY_SECRET);
}

// ── Response helpers ────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, MCP-Protocol-Version",
  };
}

function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(), ...extra },
  });
}

function mcpResponse(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-06-18",
      ...corsHeaders(),
    },
  });
}

function mcpError(id: unknown, code: number, message: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-06-18",
      ...corsHeaders(),
      ...extra,
    },
  });
}

// ── OAuth: redirect_uri validation ─────────────────────────────────────────

function isValidRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (u.protocol === "https:") return true;
    return false;
  } catch {
    return false;
  }
}

// ── OAuth: Firebase ID token validation ────────────────────────────────────

interface FirebaseJwtPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
}

// Extract SubjectPublicKeyInfo bytes from a DER-encoded X.509 certificate.
function extractSpkiFromCert(der: Uint8Array): ArrayBuffer {
  let offset = 0;

  function readLength(): number {
    const first = der[offset++];
    if (first < 0x80) return first;
    const numBytes = first & 0x7f;
    let len = 0;
    for (let i = 0; i < numBytes; i++) len = (len << 8) | der[offset++];
    return len;
  }

  function skipTag(): void { offset++; }

  function skipElement(): void {
    skipTag();
    const len = readLength();
    offset += len;
  }

  function enterSeq(): void {
    skipTag(); // 0x30 SEQUENCE
    readLength();
  }

  // Certificate SEQUENCE
  enterSeq();
  // TBSCertificate SEQUENCE
  enterSeq();
  // version [0] EXPLICIT optional (v3 certs have this)
  if (der[offset] === 0xa0) skipElement();
  skipElement(); // serialNumber
  skipElement(); // signature AlgorithmIdentifier
  skipElement(); // issuer
  skipElement(); // validity
  skipElement(); // subject
  // subjectPublicKeyInfo starts here
  const spkiStart = offset;
  skipTag();
  const spkiBodyLen = readLength();
  return der.slice(spkiStart, offset + spkiBodyLen).buffer;
}

async function validateFirebaseToken(idToken: string, projectId: string): Promise<string | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;

  let header: { kid?: string; alg?: string };
  let payload: FirebaseJwtPayload;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
  } catch {
    return null;
  }

  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.sub) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!header.kid) return null;

  let certs: Record<string, string>;
  try {
    const resp = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    certs = await resp.json();
  } catch {
    return null;
  }

  const certPem = certs[header.kid];
  if (!certPem) return null;

  const pemBody = certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
  const certDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  let pubKey: CryptoKey;
  try {
    const spki = extractSpkiFromCert(certDer);
    pubKey = await crypto.subtle.importKey(
      "spki",
      spki,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      pubKey,
      base64UrlDecode(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return valid ? payload.sub : null;
  } catch {
    return null;
  }
}

// ── Route handlers ──────────────────────────────────────────────────────────

function handleOAuthMeta(env: Env): Response {
  return jsonResponse({
    issuer: env.OAUTH_ISSUER,
    authorization_endpoint: `${env.OAUTH_ISSUER}/oauth/authorize`,
    token_endpoint: `${env.OAUTH_ISSUER}/oauth/token`,
    registration_endpoint: `${env.OAUTH_ISSUER}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp", "offline_access"],
  });
}

function handleProtectedResourceMeta(env: Env): Response {
  return jsonResponse({
    resource: env.OAUTH_ISSUER,
    authorization_servers: [env.OAUTH_ISSUER],
    scopes_supported: ["mcp", "offline_access"],
  });
}

function handleManifest(env: Env): Response {
  return jsonResponse({
    schema_version: "1.0",
    name: "SwarmSpace",
    description:
      "Intelligence layer for Claude — 13 workflow chains for competitive analysis, market scanning, research synthesis, meeting prep, tech evaluation, health research, and more.",
    version: "1.0.0",
    auth: {
      type: "oauth2",
      authorization_url: `${env.OAUTH_ISSUER}/oauth/authorize`,
      token_url: `${env.OAUTH_ISSUER}/oauth/token`,
      registration_url: `${env.OAUTH_ISSUER}/oauth/register`,
      scopes: ["mcp", "offline_access"],
    },
    tools_count: 13,
    endpoint: `${env.OAUTH_ISSUER}/mcp`,
  });
}

async function handleDCR(request: Request, env: Env): Promise<Response> {
  let body: {
    client_name?: string;
    redirect_uris?: unknown;
    grant_types?: string[];
    response_types?: string[];
    token_endpoint_auth_method?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_client_metadata", error_description: "Invalid JSON" }, 400);
  }

  if (!body.client_name || typeof body.client_name !== "string") {
    return jsonResponse({ error: "invalid_client_metadata", error_description: "client_name required" }, 400);
  }
  if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return jsonResponse({ error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array" }, 400);
  }
  for (const uri of body.redirect_uris as unknown[]) {
    if (typeof uri !== "string" || !isValidRedirectUri(uri)) {
      return jsonResponse({ error: "invalid_redirect_uri", error_description: `Invalid redirect_uri: ${uri}` }, 400);
    }
  }

  const clientId = crypto.randomUUID();
  const client: OAuthClient = {
    clientName: body.client_name,
    redirectUris: body.redirect_uris as string[],
    grantTypes: body.grant_types ?? ["authorization_code", "refresh_token"],
  };
  await env.OAUTH_CLIENTS.put(clientId, JSON.stringify(client));

  return jsonResponse(
    {
      client_id: clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201
  );
}

async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const p = url.searchParams;
  const clientId = p.get("client_id");
  const redirectUri = p.get("redirect_uri");
  const responseType = p.get("response_type");
  const state = p.get("state");
  const codeChallenge = p.get("code_challenge");
  const codeChallengeMethod = p.get("code_challenge_method");
  const resource = p.get("resource");

  if (responseType !== "code") return jsonResponse({ error: "unsupported_response_type" }, 400);
  if (!state) return jsonResponse({ error: "invalid_request", error_description: "state required" }, 400);
  if (!codeChallenge) return jsonResponse({ error: "invalid_request", error_description: "code_challenge required" }, 400);
  if (codeChallengeMethod !== "S256") return jsonResponse({ error: "invalid_request", error_description: "code_challenge_method must be S256" }, 400);
  if (!resource) return jsonResponse({ error: "invalid_request", error_description: "resource required (RFC 8707)" }, 400);
  if (!clientId) return jsonResponse({ error: "invalid_client" }, 400);
  if (!redirectUri) return jsonResponse({ error: "invalid_request", error_description: "redirect_uri required" }, 400);

  const clientRaw = await env.OAUTH_CLIENTS.get(clientId);
  if (!clientRaw) return jsonResponse({ error: "invalid_client" }, 400);
  const client: OAuthClient = JSON.parse(clientRaw);

  // Validate redirect_uri — allow loopback with any port
  const redirectAllowed = client.redirectUris.includes(redirectUri) || (() => {
    try {
      const ru = new URL(redirectUri);
      const isLoopback = ru.hostname === "localhost" || ru.hostname === "127.0.0.1";
      const registeredHasLoopback = client.redirectUris.some((r) => {
        try {
          const rr = new URL(r);
          return rr.hostname === "localhost" || rr.hostname === "127.0.0.1";
        } catch { return false; }
      });
      return isLoopback && registeredHasLoopback;
    } catch { return false; }
  })();

  if (!redirectAllowed) {
    return jsonResponse({ error: "invalid_request", error_description: "redirect_uri mismatch" }, 400);
  }

  const loginStateParams = {
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    resource,
  };
  const loginStateJson = JSON.stringify(loginStateParams);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(loginStateJson).buffer as ArrayBuffer);
  const sig = await hmacSign(env.MCP_KEY_SECRET, loginStateJson);
  const signedLoginState = `${payloadB64}.${sig}`;

  const consentUrl = new URL("https://swarmspace.app/oauth-consent.html");
  consentUrl.searchParams.set("login_state", signedLoginState);
  consentUrl.searchParams.set("client_name", client.clientName);

  return Response.redirect(consentUrl.toString(), 302);
}

async function handleAuthorizeComplete(request: Request, env: Env): Promise<Response> {
  let body: { firebase_id_token?: string; login_state?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  if (!body.firebase_id_token || !body.login_state) {
    return jsonResponse({ error: "invalid_request", error_description: "firebase_id_token and login_state required" }, 400);
  }

  const dotIndex = body.login_state.lastIndexOf(".");
  if (dotIndex === -1) return jsonResponse({ error: "invalid_state" }, 400);

  const payloadB64 = body.login_state.slice(0, dotIndex);
  const sig = body.login_state.slice(dotIndex + 1);

  let loginStateJson: string;
  try {
    loginStateJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  } catch {
    return jsonResponse({ error: "invalid_state" }, 400);
  }

  const valid = await hmacVerify(env.MCP_KEY_SECRET, loginStateJson, sig);
  if (!valid) return jsonResponse({ error: "invalid_state" }, 401);

  let params: { client_id: string; redirect_uri: string; state: string; code_challenge: string; resource: string };
  try {
    params = JSON.parse(loginStateJson);
  } catch {
    return jsonResponse({ error: "invalid_state" }, 400);
  }

  const uid = await validateFirebaseToken(body.firebase_id_token, env.FIREBASE_PROJECT_ID);
  if (!uid) return jsonResponse({ error: "invalid_token", error_description: "Firebase token invalid or expired" }, 401);

  const code = crypto.randomUUID();
  const codeRecord: OAuthCode = {
    uid,
    clientId: params.client_id,
    codeChallenge: params.code_challenge,
    redirectUri: params.redirect_uri,
    resource: params.resource,
  };
  await env.OAUTH_CODES.put(code, JSON.stringify(codeRecord), { expirationTtl: 600 });

  const redirectTo = `${params.redirect_uri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(params.state)}`;
  return jsonResponse({ redirect_to: redirectTo });
}

async function handleToken(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get("Content-Type") ?? "";
  let formData: URLSearchParams;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    formData = new URLSearchParams(await request.text());
  } else {
    try {
      const json = (await request.json()) as Record<string, string>;
      formData = new URLSearchParams(Object.entries(json).map(([k, v]) => [k, String(v)] as [string, string]));
    } catch {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
  }

  const grantType = formData.get("grant_type");

  if (grantType === "authorization_code") {
    const code = formData.get("code");
    const redirectUri = formData.get("redirect_uri");
    const clientId = formData.get("client_id");
    const codeVerifier = formData.get("code_verifier");
    const resource = formData.get("resource");

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return jsonResponse({ error: "invalid_request", error_description: "code, redirect_uri, client_id, code_verifier required" }, 400);
    }

    const codeRaw = await env.OAUTH_CODES.get(code);
    if (!codeRaw) return jsonResponse({ error: "invalid_grant" }, 400);
    const stored: OAuthCode = JSON.parse(codeRaw);

    // PKCE S256 verification
    const verifierHash = base64UrlEncode(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
    );
    if (verifierHash !== stored.codeChallenge) {
      return jsonResponse({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
    }

    if (stored.clientId !== clientId) return jsonResponse({ error: "invalid_grant" }, 400);

    // redirect_uri check with loopback flexibility
    const redirectMatch = stored.redirectUri === redirectUri || (() => {
      try {
        const su = new URL(stored.redirectUri);
        const ru = new URL(redirectUri);
        return (
          (su.hostname === "localhost" || su.hostname === "127.0.0.1") &&
          (ru.hostname === "localhost" || ru.hostname === "127.0.0.1") &&
          su.pathname === ru.pathname
        );
      } catch { return false; }
    })();
    if (!redirectMatch) return jsonResponse({ error: "invalid_grant" }, 400);

    if (resource && stored.resource !== resource) return jsonResponse({ error: "invalid_grant" }, 400);

    // Single-use: delete code immediately
    await env.OAUTH_CODES.delete(code);

    // Signed access token — validated by HMAC, no KV read on every request.
    const accessToken = await issueSignedAccessToken(stored.uid, stored.clientId, env.MCP_KEY_SECRET);
    const refreshToken = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const tokenRecord: OAuthTokenRecord = { uid: stored.uid, clientId: stored.clientId };

    await env.OAUTH_TOKENS.put(`rt:${await sha256Hex(refreshToken)}`, JSON.stringify(tokenRecord), { expirationTtl: 2592000 });

    return jsonResponse({ access_token: accessToken, token_type: "Bearer", expires_in: 3600, refresh_token: refreshToken, scope: "mcp" });
  }

  if (grantType === "refresh_token") {
    const refreshToken = formData.get("refresh_token");
    const clientId = formData.get("client_id");

    if (!refreshToken || !clientId) {
      return jsonResponse({ error: "invalid_request", error_description: "refresh_token and client_id required" }, 400);
    }

    const rtKey = `rt:${await sha256Hex(refreshToken)}`;
    const storedRaw = await env.OAUTH_TOKENS.get(rtKey);
    if (!storedRaw) return jsonResponse({ error: "invalid_grant" }, 400);
    const stored: OAuthTokenRecord = JSON.parse(storedRaw);

    if (stored.clientId !== clientId) return jsonResponse({ error: "invalid_grant" }, 400);

    await env.OAUTH_TOKENS.delete(rtKey);

    const newAccessToken = await issueSignedAccessToken(stored.uid, stored.clientId, env.MCP_KEY_SECRET);
    const newRefreshToken = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const tokenRecord: OAuthTokenRecord = { uid: stored.uid, clientId: stored.clientId };

    await env.OAUTH_TOKENS.put(`rt:${await sha256Hex(newRefreshToken)}`, JSON.stringify(tokenRecord), { expirationTtl: 2592000 });

    return jsonResponse({ access_token: newAccessToken, token_type: "Bearer", expires_in: 3600, refresh_token: newRefreshToken, scope: "mcp" });
  }

  return jsonResponse({ error: "unsupported_grant_type" }, 400);
}

async function handleMcp(request: Request, env: Env): Promise<Response> {
  let rpc: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
  try {
    rpc = await request.json();
  } catch {
    return mcpError(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = rpc;

  if (method === "initialize") {
    return mcpResponse(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: env.MCP_SERVER_NAME, version: env.MCP_SERVER_VERSION },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(null, {
      status: 204,
      headers: { "MCP-Protocol-Version": "2025-06-18", ...corsHeaders() },
    });
  }

  // All other methods require auth
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const uid = await getUid(token, env);

  if (!uid) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32001, message: "Invalid or missing credentials" } }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "2025-06-18",
          "WWW-Authenticate": `Bearer resource="${env.OAUTH_ISSUER}", resource_metadata="${env.OAUTH_ISSUER}/.well-known/oauth-protected-resource"`,
          ...corsHeaders(),
        },
      }
    );
  }

  if (method === "tools/list") {
    return mcpResponse(id, {
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, ...(t.annotations ? { annotations: t.annotations } : {}) })),
    });
  }

  if (method === "tools/call") {
    const callParams = params as { name?: string; arguments?: Record<string, unknown> };
    const toolName = callParams.name ?? "";
    const args = callParams.arguments ?? {};

    const tool = toolByName(toolName);
    if (!tool) return mcpError(id, -32602, `Unknown tool: ${toolName}`);

    const body = {
      query: (args.query as string) ?? (args.attendee_name as string) ?? "",
      ...args,
      _service_token: env.SWARMSPACE_INTERNAL_TOKEN,
      _run_as_uid: uid,
    };

    // Streamable HTTP: honour Accept: text/event-stream
    const accept = request.headers.get("Accept") ?? "";
    if (accept.includes("text/event-stream")) {
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const enc = new TextEncoder();

      (async () => {
        try {
          const resp = await fetch(`${env.ORCHESTRATOR_URL}${tool.orchestratorRoute}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(55_000),
          });
          if (!resp.ok) {
            const text = await resp.text();
            await writer.write(
              enc.encode(
                `data: ${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message: `Orchestrator error (${resp.status}): ${text}` } })}\n\n`
              )
            );
          } else {
            const result = await resp.json();
            await writer.write(
              enc.encode(
                `data: ${JSON.stringify({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } })}\n\n`
              )
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await writer.write(
            enc.encode(`data: ${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message: msg } })}\n\n`)
          );
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "MCP-Protocol-Version": "2025-06-18",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, MCP-Protocol-Version",
        },
      });
    }

    // Synchronous path
    let resp: Response;
    try {
      resp = await fetch(`${env.ORCHESTRATOR_URL}${tool.orchestratorRoute}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(55_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return mcpError(id, -32603, `Orchestrator request failed: ${msg}`);
    }

    if (!resp.ok) {
      const text = await resp.text();
      return mcpError(id, -32603, `Orchestrator error (${resp.status}): ${text}`);
    }

    let orchestratorResult: unknown;
    try {
      orchestratorResult = await resp.json();
    } catch {
      return mcpError(id, -32603, "Orchestrator returned invalid JSON");
    }

    return mcpResponse(id, { content: [{ type: "text", text: JSON.stringify(orchestratorResult, null, 2) }] });
  }

  return mcpError(id, -32601, "Method not found");
}

// ── Main fetch handler ──────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "GET" && url.pathname === "/.well-known/oauth-authorization-server") {
      return handleOAuthMeta(env);
    }
    if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
      return handleProtectedResourceMeta(env);
    }
    if (request.method === "GET" && url.pathname === "/.well-known/mcp/manifest.json") {
      return handleManifest(env);
    }
    if (request.method === "POST" && url.pathname === "/oauth/register") {
      return handleDCR(request, env);
    }
    if (request.method === "GET" && url.pathname === "/oauth/authorize") {
      return handleAuthorize(request, env);
    }
    if (request.method === "POST" && url.pathname === "/oauth/authorize/complete") {
      return handleAuthorizeComplete(request, env);
    }
    if (request.method === "POST" && url.pathname === "/oauth/token") {
      return handleToken(request, env);
    }
    if (request.method === "POST" && (url.pathname === "/mcp" || url.pathname === "/")) {
      return handleMcp(request, env);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  },
};
