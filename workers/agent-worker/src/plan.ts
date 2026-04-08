// Plan generation handler
// Receives a task + tier, calls gemini-flash with a restricted system prompt,
// returns a structured AgentPlan JSON object.

import { Tier, getToolsForTier, formatToolListForPrompt, planRequiresPremium, planRequiresConsent } from "./tiers";

export interface AgentPlan {
  goal: string;
  clarifications: string[];
  steps: PlanStep[];
  tools_required: string[];
  estimated_tool_calls: number;
  requires_premium: boolean;
  tier_gate: boolean;
  requires_consent: boolean; // New: indicates if any tools require user consent
  privacy_sensitive_tools: string[]; // New: list of privacy-sensitive tools used
}

export interface PlanStep {
  step: number;
  description: string;
  tool: string | null;
  rationale: string;
}

function buildPlanSystemPrompt(tier: Tier): string {
  const tools = getToolsForTier(tier);
  const toolList = formatToolListForPrompt(tools);

  return `You are a planning agent. Your job is to analyze the user's task and produce a structured execution plan. You must NOT take any actions, call any tools, or produce any output other than the plan JSON.

Available tools for this user's tier:
${toolList}

Analyze the task carefully. Identify:
- What the goal is
- Which tools from the available list are needed and why
- The sequence of steps in logical order
- Any clarifying questions if the task is ambiguous
- Estimated number of tool calls

Respond ONLY with a valid JSON object matching this schema. No preamble, no markdown fences, no explanation:

{
  "goal": "One sentence summary of what will be accomplished",
  "clarifications": ["Any questions before proceeding — empty array if none"],
  "steps": [
    {
      "step": 1,
      "description": "What this step does",
      "tool": "tool_name_or_null",
      "rationale": "Why this tool / why this order"
    }
  ],
  "tools_required": ["list", "of", "tool", "names"],
  "estimated_tool_calls": 4,
  "requires_premium": false
}`;
}

function parsePlanResponse(raw: string): AgentPlan | null {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(raw);
    if (parsed.goal && Array.isArray(parsed.steps)) {
      return parsed as AgentPlan;
    }
  } catch {
    // Fall through to extraction
  }

  // Try extracting JSON from markdown fences or surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.goal && Array.isArray(parsed.steps)) {
        return parsed as AgentPlan;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Build a fallback plan when JSON parsing fails.
 * Shows the raw LLM response as a single-step "review" plan.
 */
function buildFallbackPlan(rawResponse: string, task: string): AgentPlan {
  return {
    goal: `Review and execute: ${task.slice(0, 100)}`,
    clarifications: ["The planning model returned a non-standard response. Please review the summary below."],
    steps: [
      {
        step: 1,
        description: rawResponse.slice(0, 500),
        tool: null,
        rationale: "Fallback — original plan could not be parsed as structured JSON",
      },
    ],
    tools_required: [],
    estimated_tool_calls: 0,
    requires_premium: false,
    tier_gate: false,
    requires_consent: false,
    privacy_sensitive_tools: [],
  };
}

export async function generatePlan(
  task: string,
  tier: Tier,
  routerUrl: string,
  authToken: string
): Promise<AgentPlan> {
  const systemPrompt = buildPlanSystemPrompt(tier);

  // Call gemini-flash via swarmspaceRouter for plan generation
  const response = await fetch(routerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authToken,
    },
    body: JSON.stringify({
      data: {
        plugin_id: "gemini-flash",
        params: {
          prompt: `${systemPrompt}\n\nUser task: ${task}`,
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Plan generation failed (${response.status}): ${err}`);
  }

  const result = await response.json() as Record<string, unknown>;

  // Extract the text response from gemini-flash
  // The router wraps in { result: { text: "..." } } or similar
  let rawText = "";
  if (typeof result === "object" && result !== null) {
    // Navigate common response shapes
    const r = (result as any).result ?? result;
    rawText = r.text ?? r.content ?? r.response ?? JSON.stringify(r);
  }

  // Parse the plan
  const plan = parsePlanResponse(rawText);

  if (!plan) {
    return buildFallbackPlan(rawText, task);
  }

  // Apply tier gating
  const requiresPremium = planRequiresPremium(
    plan.tools_required || [],
    tier
  );
  plan.requires_premium = requiresPremium;
  plan.tier_gate = requiresPremium && tier !== "premium";

  // Apply consent requirements
  const requiresConsent = planRequiresConsent(plan.tools_required || []);
  plan.requires_consent = requiresConsent;

  // Identify privacy-sensitive tools for consent UI
  const tools = getToolsForTier(tier);
  const privacySensitiveTools = tools
    .filter(tool =>
      (plan.tools_required || []).includes(tool.id) &&
      tool.privacyTier !== "anonymous"
    )
    .map(tool => tool.id);
  plan.privacy_sensitive_tools = privacySensitiveTools;

  return plan;
}
