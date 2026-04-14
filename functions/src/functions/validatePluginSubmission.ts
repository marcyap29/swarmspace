// validatePluginSubmission.ts - Server-side validation for plugin submissions
//
// Callable Cloud Function that validates plugin submission data before
// it's written to Firestore. Checks field constraints, endpoint
// reachability, and optional manifest validity.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import dns from "dns";
import { enforceAuth } from "../authGuard";

// ── Valid enum values ────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  "search", "data", "ai", "utility", "social", "finance", "developer", "other",
  // Also accept the display-name categories from the submit form
  "Research", "Productivity", "Finance", "Health", "Creative",
  "Developer Tools", "Communication", "Data", "Other",
];

const VALID_PRICING_MODELS = ["free", "per_call", "subscription", "Free", "Credits"];

const VALID_AUTH_METHODS = ["none", "api_key", "oauth2", "None", "API Key", "OAuth 2.0"];

const VALID_ACCESS_TIERS = ["free", "standard", "premium"];

const PLUGIN_ID_REGEX = /^[a-z][a-z0-9-]{2,49}$/;

// ── Manifest required fields (from DEVELOPER_GUIDE.md JSON Schema) ────────

const MANIFEST_REQUIRED_FIELDS = [
  "name", "description", "access_tier", "credit_cost_per_call",
  "semantic_tags", "latency_class", "privacy_data_required",
  "auth_method", "endpoint_url", "network_domains",
];

// ── Types ────────────────────────────────────────────────────────────────────

interface SchemaCheck {
  passed: boolean;
  errors: string[];
}

interface EndpointCheck {
  reachable: boolean;
  status_code: number | null;
  latency_ms: number | null;
  valid_response: boolean;
  error: string | null;
}

interface ManifestCheck {
  fetched: boolean;
  valid: boolean;
  error: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    schema: SchemaCheck;
    endpoint: EndpointCheck;
    manifest: ManifestCheck;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * SSRF protection — returns true if the URL resolves to a private/internal IP.
 * Returns true (reject) on any failure as a safe default.
 */
async function isPrivateUrl(url: string): Promise<boolean> {
  try {
    const { hostname } = new URL(url);

    let addresses: string[] = [];
    try {
      const ipv4 = await dns.promises.resolve4(hostname);
      addresses = addresses.concat(ipv4);
    } catch { /* no A records */ }

    try {
      const ipv6 = await dns.promises.resolve6(hostname);
      addresses = addresses.concat(ipv6);
    } catch { /* no AAAA records */ }

    // If DNS returned nothing at all, reject as a safety measure
    if (addresses.length === 0) return true;

    const isPrivateIpv4 = (ip: string): boolean => {
      const parts = ip.split(".").map(Number);
      if (parts.length !== 4) return false;
      const [a, b] = parts;

      if (a === 0) return true;                          // 0.0.0.0/8
      if (a === 127) return true;                        // 127.0.0.0/8
      if (a === 10) return true;                         // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
      if (a === 192 && b === 168) return true;           // 192.168.0.0/16
      if (a === 169 && b === 254) return true;           // 169.254.0.0/16 (link-local + cloud metadata)
      if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (carrier-grade NAT / cloud)

      return false;
    };

    const isPrivate = (ip: string): boolean => {
      const lower = ip.toLowerCase();

      // IPv6 loopback
      if (lower === "::1" || lower === "::") return true;
      // IPv6 link-local (fe80::/10)
      if (lower.startsWith("fe80")) return true;
      // IPv6 unique local addresses (fc00::/7 — fd00:: prefix)
      if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
      // IPv4-mapped IPv6 (::ffff:x.x.x.x)
      if (lower.startsWith("::ffff:")) {
        const mapped = ip.slice(7); // extract the IPv4 part
        return isPrivateIpv4(mapped);
      }

      // IPv4
      return isPrivateIpv4(ip);
    };

    return addresses.some(isPrivate);
  } catch {
    // Parse error or unexpected failure — reject to be safe
    return true;
  }
}

function validateSchema(data: Record<string, unknown>): SchemaCheck {
  const errors: string[] = [];

  // plugin_name
  const name = data.plugin_name ?? data.name;
  if (!name || typeof name !== "string") {
    errors.push("plugin_name is required and must be a string.");
  } else if (name.length < 3 || name.length > 100) {
    errors.push(`plugin_name must be 3-100 characters (got ${name.length}).`);
  }

  // plugin_id (optional — not all submissions include it)
  const pluginId = data.plugin_id;
  if (pluginId !== undefined && pluginId !== null) {
    if (typeof pluginId !== "string") {
      errors.push("plugin_id must be a string.");
    } else if (!PLUGIN_ID_REGEX.test(pluginId)) {
      errors.push("plugin_id must be lowercase letters/numbers/hyphens, 3-50 chars, starting with a letter.");
    }
  }

  // description
  const desc = data.description;
  if (!desc || typeof desc !== "string") {
    errors.push("description is required and must be a string.");
  } else if (desc.length < 50 || desc.length > 500) {
    errors.push(`description must be 50-500 characters (got ${desc.length}).`);
  }

  // category
  const category = data.category;
  if (!category || typeof category !== "string") {
    errors.push("category is required.");
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.push(`category "${category}" is not valid. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  // endpoint_url
  const endpoint = data.endpoint_url;
  if (!endpoint || typeof endpoint !== "string") {
    errors.push("endpoint_url is required.");
  } else if (!endpoint.startsWith("https://")) {
    errors.push("endpoint_url must use HTTPS. Plain HTTP endpoints are not allowed.");
  } else {
    // Validate it parses as a real URL
    try {
      const parsed = new URL(endpoint);
      if (parsed.protocol !== "https:") {
        errors.push("endpoint_url must use HTTPS. Plain HTTP endpoints are not allowed.");
      }
    } catch {
      errors.push("endpoint_url is not a valid URL.");
    }
  }

  // pricing_model
  const pricing = data.pricing_model;
  if (!pricing || typeof pricing !== "string") {
    errors.push("pricing_model is required.");
  } else if (!VALID_PRICING_MODELS.includes(pricing)) {
    errors.push(`pricing_model "${pricing}" is not valid. Must be one of: ${VALID_PRICING_MODELS.join(", ")}`);
  }

  // auth_method
  const auth = data.auth_method;
  if (!auth || typeof auth !== "string") {
    errors.push("auth_method is required.");
  } else if (!VALID_AUTH_METHODS.includes(auth)) {
    errors.push(`auth_method "${auth}" is not valid. Must be one of: ${VALID_AUTH_METHODS.join(", ")}`);
  }

  // tags / semantic_tags
  const tags = data.tags ?? data.semantic_tags;
  if (!Array.isArray(tags)) {
    errors.push("tags must be an array of strings.");
  } else {
    if (tags.length < 1 || tags.length > 10) {
      errors.push(`tags must have 1-10 items (got ${tags.length}).`);
    }
    const nonStrings = tags.filter((t: unknown) => typeof t !== "string");
    if (nonStrings.length > 0) {
      errors.push("All tags must be strings.");
    }
  }

  // access_tier (required, blocking)
  const accessTier = data.access_tier;
  if (!accessTier || typeof accessTier !== "string") {
    errors.push("access_tier is required.");
  } else if (!VALID_ACCESS_TIERS.includes(accessTier)) {
    errors.push('access_tier must be one of: free, standard, premium');
  }

  // capabilities (required, blocking)
  const capabilities = data.capabilities;
  if (!capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
    errors.push("capabilities is required and must be a non-empty array.");
  } else if (capabilities !== undefined && capabilities !== null) {
    if (!Array.isArray(capabilities)) {
      errors.push('capabilities must be an array of strings.');
    } else {
      if (capabilities.length < 1 || capabilities.length > 10) {
        errors.push(`capabilities must have 1-10 items (got ${capabilities.length}).`);
      }
      const badCaps = capabilities.filter((c: unknown) => typeof c !== 'string');
      if (badCaps.length > 0) {
        errors.push('All capabilities must be strings.');
      }
    }
  }

  // example_query (optional, validate length if provided)
  const exampleQuery = data.example_query;
  if (typeof exampleQuery === 'string' && (exampleQuery.length < 10 || exampleQuery.length > 200)) {
    errors.push('example_query must be 10-200 characters if provided.');
  }

  // version (optional, validate semver format if provided)
  const version = data.version;
  if (typeof version === 'string' && !/^\d+\.\d+\.\d+$/.test(version)) {
    errors.push('version must be in semver format (e.g., 1.0.0).');
  }

  // rate_limits (optional, validate structure if provided)
  const rateLimits = data.rate_limits;
  if (rateLimits !== undefined && rateLimits !== null) {
    if (typeof rateLimits !== 'object' || Array.isArray(rateLimits)) {
      errors.push('rate_limits must be an object with free, standard, premium keys.');
    } else {
      const rl = rateLimits as Record<string, unknown>;
      for (const key of ['free', 'standard', 'premium']) {
        if (rl[key] !== undefined && (typeof rl[key] !== 'number' || (rl[key] as number) < 0)) {
          errors.push(`rate_limits.${key} must be a non-negative number.`);
        }
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

async function checkDuplicates(
  name: string,
  endpointUrl: string
): Promise<{ isDuplicate: boolean; errors: string[] }> {
  const errors: string[] = [];
  const db = getFirestore();
  const submissionsRef = db.collection("plugin_submissions");

  // Query all pending/approved submissions and check for duplicates
  const activeStatuses = ["pending", "approved"];
  const snapshot = await submissionsRef
    .where("status", "in", activeStatuses)
    .get();

  const nameLower = name.toLowerCase();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Check endpoint URL match
    if (data.endpoint_url === endpointUrl) {
      errors.push(
        `A plugin with this endpoint URL is already submitted (status: ${data.status})`
      );
    }

    // Check name match (case-insensitive)
    const existingName =
      typeof data.name === "string" ? data.name.toLowerCase() : "";
    const existingPluginName =
      typeof data.plugin_name === "string"
        ? data.plugin_name.toLowerCase()
        : "";
    if (existingName === nameLower || existingPluginName === nameLower) {
      errors.push(
        `A plugin with this name already exists (status: ${data.status})`
      );
    }
  }

  return { isDuplicate: errors.length > 0, errors };
}

async function checkEndpoint(endpointUrl: string): Promise<EndpointCheck> {
  const invokeUrl = endpointUrl.replace(/\/+$/, "") + "/invoke";
  const start = Date.now();

  // SSRF protection — block requests to private/internal IPs
  if (await isPrivateUrl(endpointUrl)) {
    return {
      reachable: false,
      status_code: null,
      latency_ms: null,
      valid_response: false,
      error: "Endpoint resolves to a private/internal IP address",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(invokeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "health_check" }),
      signal: controller.signal,
      redirect: "error",
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    let validResponse = false;
    try {
      const body = await response.json();
      // Body must be a plain object (not null, not an array, not a primitive)
      if (
        body != null &&
        typeof body === "object" &&
        !Array.isArray(body)
      ) {
        // Accept common SwarmSpace worker response shapes
        const hasResults = "results" in body;
        const hasData = "data" in body;
        const hasError = "error" in body && typeof body.error === "string";
        validResponse = hasResults || hasData || hasError;
      }
    } catch {
      // Response is not valid JSON
    }

    return {
      reachable: true,
      status_code: response.status,
      latency_ms: latency,
      valid_response: validResponse,
      error: null,
    };
  } catch (err: unknown) {
    const latency = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      reachable: false,
      status_code: null,
      latency_ms: latency,
      valid_response: false,
      error: message,
    };
  }
}

async function checkManifest(manifestUrl: string): Promise<ManifestCheck> {
  // SSRF protection — block requests to private/internal IPs
  if (await isPrivateUrl(manifestUrl)) {
    return { fetched: false, valid: false, error: "Manifest URL resolves to a private/internal IP address" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(manifestUrl, {
      signal: controller.signal,
      redirect: "error",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { fetched: false, valid: false, error: `HTTP ${response.status}` };
    }

    let manifest: Record<string, unknown>;
    try {
      manifest = await response.json();
    } catch {
      return { fetched: true, valid: false, error: "Response is not valid JSON." };
    }

    if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
      return { fetched: true, valid: false, error: "Manifest must be a JSON object." };
    }

    // Check required fields from the schema
    const missing = MANIFEST_REQUIRED_FIELDS.filter((f) => !(f in manifest));
    if (missing.length > 0) {
      return {
        fetched: true,
        valid: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      };
    }

    return { fetched: true, valid: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { fetched: false, valid: false, error: message };
  }
}

// ── Cloud Function ───────────────────────────────────────────────────────────

export const validatePluginSubmission = onCall(
  {
    timeoutSeconds: 30,
  },
  async (request): Promise<ValidationResult> => {
    // Require authentication
    await enforceAuth(request);

    const data = request.data;
    if (!data || typeof data !== "object") {
      throw new HttpsError("invalid-argument", "Request body must be an object.");
    }

    logger.info("validatePluginSubmission called", {
      uid: request.auth?.uid,
      plugin_name: data.plugin_name ?? data.name,
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Schema validation
    const schema = validateSchema(data);
    if (!schema.passed) {
      errors.push(...schema.errors);
    }

    // 1b. Duplicate detection
    const pluginName = (data.plugin_name ?? data.name) as string | undefined;
    const pluginEndpoint = data.endpoint_url as string | undefined;
    if (pluginName && pluginEndpoint) {
      const dupes = await checkDuplicates(pluginName, pluginEndpoint);
      if (dupes.isDuplicate) {
        errors.push(...dupes.errors);
      }
    }

    // 2. Endpoint reachability check (non-blocking)
    let endpoint: EndpointCheck = {
      reachable: false,
      status_code: null,
      latency_ms: null,
      valid_response: false,
      error: "Skipped — no valid endpoint_url.",
    };

    const endpointUrl = data.endpoint_url;
    if (typeof endpointUrl === "string" && endpointUrl.startsWith("https://")) {
      endpoint = await checkEndpoint(endpointUrl);

      if (!endpoint.reachable) {
        // SSRF block — always a blocking error
        if (endpoint.error?.includes("private/internal IP")) {
          errors.push(`Endpoint blocked: ${endpoint.error}`);
        // Timeout or server crash (status_code null or >= 500) — blocking error
        } else if (endpoint.status_code === null || (endpoint.status_code !== null && endpoint.status_code >= 500)) {
          errors.push(
            "Endpoint is unreachable (server error or timeout). Your worker must be deployed and responding before submission."
          );
        } else {
          // Other unreachable reasons — still blocking
          errors.push(`Endpoint not reachable: ${endpoint.error}`);
        }
      } else if (!endpoint.valid_response) {
        warnings.push(
          "Endpoint responded but did not return a valid JSON object with a 'results', 'data', or 'error' field."
        );
      } else if (endpoint.status_code && endpoint.status_code >= 400 && endpoint.status_code < 500) {
        warnings.push(`Endpoint returned HTTP ${endpoint.status_code} (may be expected for health_check query).`);
      }
    }

    // 3. Manifest check (optional, non-blocking)
    let manifest: ManifestCheck = {
      fetched: false,
      valid: false,
      error: null,
    };

    const manifestUrl = data.manifest_url;
    if (typeof manifestUrl === "string" && manifestUrl.length > 0) {
      manifest = await checkManifest(manifestUrl);

      if (!manifest.fetched) {
        warnings.push(`Could not fetch manifest: ${manifest.error}`);
      } else if (!manifest.valid) {
        warnings.push(`Manifest is invalid: ${manifest.error}`);
      }
    }

    const valid = errors.length === 0;

    logger.info("validatePluginSubmission result", {
      valid,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return {
      valid,
      errors,
      warnings,
      checks: {
        schema,
        endpoint,
        manifest,
      },
    };
  }
);
