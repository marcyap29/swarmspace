// validatePluginSubmission.ts - Server-side validation for plugin submissions
//
// Callable Cloud Function that validates plugin submission data before
// it's written to Firestore. Checks field constraints, endpoint
// reachability, and optional manifest validity.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
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
  } else if (desc.length < 10 || desc.length > 500) {
    errors.push(`description must be 10-500 characters (got ${desc.length}).`);
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
    errors.push("endpoint_url must start with https://");
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

  return { passed: errors.length === 0, errors };
}

async function checkEndpoint(endpointUrl: string): Promise<EndpointCheck> {
  const invokeUrl = endpointUrl.replace(/\/+$/, "") + "/invoke";
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(invokeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "health_check" }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    let validResponse = false;
    try {
      const body = await response.json();
      validResponse = body != null && (("results" in body) || ("error" in body));
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(manifestUrl, {
      signal: controller.signal,
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

      // Endpoint issues are warnings, not errors
      if (!endpoint.reachable) {
        warnings.push(`Endpoint not reachable: ${endpoint.error}`);
      } else if (!endpoint.valid_response) {
        warnings.push("Endpoint responded but did not return a valid JSON body with 'results' or 'error' field.");
      } else if (endpoint.status_code && endpoint.status_code >= 400) {
        warnings.push(`Endpoint returned HTTP ${endpoint.status_code}.`);
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
