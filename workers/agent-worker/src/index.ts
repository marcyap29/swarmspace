// SwarmSpace Agent Worker
// Two-phase agent execution: Plan → Review → Execute
//
// Routes:
//   POST /agent/plan    — Generate a structured execution plan
//   POST /agent/execute — Execute an approved plan step by step
//
// Auth: Firebase ID token passed through to swarmspaceRouter.
// All plugin calls go through swarmspaceRouter (never direct to Workers)
// so quota/credit enforcement still applies.

import { generatePlan } from "./plan";
import { executePlan } from "./execute";
import { Tier } from "./tiers";

export interface Env {
  SWARMSPACE_ROUTER_URL: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "POST required" }, 405);
    }

    // Require Firebase ID token (passed through to swarmspaceRouter)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing Authorization: Bearer <token>" }, 401);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route: Plan generation
    if (path === "/agent/plan" || path === "/agent/plan/") {
      return handlePlan(request, env, authHeader);
    }

    // Route: Plan execution
    if (path === "/agent/execute" || path === "/agent/execute/") {
      return handleExecute(request, env, authHeader);
    }

    return jsonResponse({
      error: "Not found",
      routes: ["/agent/plan", "/agent/execute"],
    }, 404);
  },
};

// ── Plan Generation ──────────────────────────────────────────────────────────

async function handlePlan(
  request: Request,
  env: Env,
  authToken: string
): Promise<Response> {
  let body: { task?: string; tier?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const task = body.task;
  if (!task || typeof task !== "string" || task.trim().length === 0) {
    return jsonResponse({ error: "Missing required field: task" }, 400);
  }

  const tier = validateTier(body.tier);

  try {
    const plan = await generatePlan(
      task.trim(),
      tier,
      env.SWARMSPACE_ROUTER_URL,
      authToken
    );

    return jsonResponse({
      phase: "plan",
      plan,
    });
  } catch (err: any) {
    return jsonResponse({
      error: "Plan generation failed",
      detail: err?.message ?? "Unknown error",
    }, 502);
  }
}

// ── Plan Execution ───────────────────────────────────────────────────────────

async function handleExecute(
  request: Request,
  env: Env,
  authToken: string
): Promise<Response> {
  let body: { task?: string; approved_plan?: any; tier?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const task = body.task;
  if (!task || typeof task !== "string") {
    return jsonResponse({ error: "Missing required field: task" }, 400);
  }

  const approvedPlan = body.approved_plan;
  if (!approvedPlan || !approvedPlan.goal || !Array.isArray(approvedPlan.steps)) {
    return jsonResponse({ error: "Missing or invalid approved_plan" }, 400);
  }

  // Block execution if tier-gated
  if (approvedPlan.tier_gate === true) {
    return jsonResponse({
      error: "Plan requires premium tools not available on your tier",
      upgrade_url: "https://swarmspace.ai/upgrade",
    }, 403);
  }

  const tier = validateTier(body.tier);

  try {
    const result = await executePlan(
      task.trim(),
      approvedPlan,
      env.SWARMSPACE_ROUTER_URL,
      authToken
    );

    return jsonResponse({
      phase: "execution",
      result,
    });
  } catch (err: any) {
    return jsonResponse({
      error: "Execution failed",
      detail: err?.message ?? "Unknown error",
    }, 500);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateTier(raw: string | undefined): Tier {
  if (raw === "standard" || raw === "premium") return raw;
  return "free";
}
