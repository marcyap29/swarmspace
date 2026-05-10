// Execution handler
// Receives an approved plan + task, executes each step via swarmspaceRouter,
// collects results, and returns a structured execution summary.

import { AgentPlan, PlanStep } from "./plan";

export interface StepResult {
  step: number;
  tool: string | null;
  status: "success" | "error" | "skipped";
  data: unknown;
  error?: string;
  duration_ms: number;
}

export interface ExecutionResult {
  goal: string;
  steps: StepResult[];
  total_duration_ms: number;
  tools_called: number;
  tools_succeeded: number;
  tools_failed: number;
  synthesis: string | null;
}

function buildExecutionSystemPrompt(plan: AgentPlan): string {
  return `The user has reviewed and approved the following plan. Execute it step by step. Do not deviate from the approved tool sequence unless a step fails and an alternative is necessary.

APPROVED PLAN:
${JSON.stringify(plan, null, 2)}

For each step, call the specified tool with appropriate parameters derived from the task context and previous step results. After all steps complete, synthesize the results into a coherent response.`;
}

/**
 * Execute a single plan step by calling a plugin via swarmspaceRouter.
 */
async function executeStep(
  step: PlanStep,
  task: string,
  previousResults: StepResult[],
  routerUrl: string,
  authToken: string
): Promise<StepResult> {
  const start = Date.now();

  if (!step.tool) {
    // Steps without tools are reasoning/synthesis steps — skip the router call
    return {
      step: step.step,
      tool: null,
      status: "skipped",
      data: { note: step.description },
      duration_ms: Date.now() - start,
    };
  }

  // Build params from task context and step description
  // For search-type tools, extract a query from the step description
  const params = buildParamsForStep(step, task, previousResults);

  try {
    const response = await fetch(routerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      body: JSON.stringify({
        data: {
          plugin_id: step.tool,
          params: { ...params, _prism_consent: true },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        step: step.step,
        tool: step.tool,
        status: "error",
        data: null,
        error: `Plugin ${step.tool} returned ${response.status}: ${errText.slice(0, 200)}`,
        duration_ms: Date.now() - start,
      };
    }

    const data = await response.json();
    return {
      step: step.step,
      tool: step.tool,
      status: "success",
      data,
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      step: step.step,
      tool: step.tool,
      status: "error",
      data: null,
      error: err?.message ?? "Step execution failed",
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Build plugin params from the step description and task context.
 * Uses heuristics to map step descriptions to plugin-appropriate params.
 */
function buildParamsForStep(
  step: PlanStep,
  task: string,
  previousResults: StepResult[]
): Record<string, unknown> {
  const tool = step.tool!;

  // Extract a search query from the step description
  // Prefer the step description; fall back to the original task
  const searchQuery = step.description.length > 10
    ? step.description
    : task;

  // Common search-type plugins
  const searchPlugins = new Set([
    "brave-search", "semantic-scholar", "wikipedia", "news",
    "arxiv", "pubmed", "hackernews", "github-public",
    "tavily-search", "exa-search", "perplexity-sonar",
    "dictionary-api", "nominatim", "rest-countries",
  ]);

  if (searchPlugins.has(tool)) {
    return { query: searchQuery, count: 5, limit: 5 };
  }

  // URL-reading plugins
  if (tool === "url-reader" || tool === "jina-reader") {
    // Try to extract a URL from previous results or the step description
    const urlMatch = step.description.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return { url: urlMatch[0] };
    }
    // Check previous results for URLs
    for (const prev of previousResults) {
      if (prev.status === "success" && prev.data) {
        const dataStr = JSON.stringify(prev.data);
        const prevUrl = dataStr.match(/https?:\/\/[^\s"]+/);
        if (prevUrl) {
          return { url: prevUrl[0] };
        }
      }
    }
    return { url: task };
  }

  // LLM synthesis plugins
  if (tool === "gemini-flash") {
    // Build a synthesis prompt from previous results
    const context = previousResults
      .filter((r) => r.status === "success")
      .map((r) => `Step ${r.step} (${r.tool}): ${JSON.stringify(r.data).slice(0, 500)}`)
      .join("\n\n");

    return {
      prompt: `${step.description}\n\nTask: ${task}\n\nContext from previous steps:\n${context}`,
    };
  }

  // Weather
  if (tool === "weather") {
    return { query: searchQuery };
  }

  // Currency
  if (tool === "currency") {
    return { base: "USD" };
  }

  // Default: pass the description as a query
  return { query: searchQuery };
}

/**
 * Execute all steps in an approved plan sequentially.
 */
export async function executePlan(
  task: string,
  plan: AgentPlan,
  routerUrl: string,
  authToken: string
): Promise<ExecutionResult> {
  const totalStart = Date.now();
  const stepResults: StepResult[] = [];

  for (const step of plan.steps) {
    const result = await executeStep(step, task, stepResults, routerUrl, authToken);
    stepResults.push(result);
  }

  // Final synthesis step: ask gemini-flash to summarize all results
  let synthesis: string | null = null;
  const successfulSteps = stepResults.filter((r) => r.status === "success");

  if (successfulSteps.length > 0) {
    try {
      const synthContext = successfulSteps
        .map((r) => `[${r.tool}]: ${JSON.stringify(r.data).slice(0, 800)}`)
        .join("\n\n");

      const synthResponse = await fetch(routerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({
          data: {
            plugin_id: "gemini-flash",
            params: {
              prompt: `Synthesize a clear, concise response to this task based on the collected data.\n\nTask: ${task}\n\nGoal: ${plan.goal}\n\nData collected:\n${synthContext}\n\nProvide a well-structured answer that directly addresses the user's task.`,
              _prism_consent: true,
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (synthResponse.ok) {
        const synthResult = await synthResponse.json() as any;
        const r = synthResult.result ?? synthResult;
        synthesis = r.text ?? r.content ?? r.response ?? null;
      }
    } catch {
      // Synthesis is optional — don't fail the execution
    }
  }

  const toolsCalled = stepResults.filter((r) => r.tool !== null).length;
  const toolsSucceeded = stepResults.filter((r) => r.status === "success").length;
  const toolsFailed = stepResults.filter((r) => r.status === "error").length;

  return {
    goal: plan.goal,
    steps: stepResults,
    total_duration_ms: Date.now() - totalStart,
    tools_called: toolsCalled,
    tools_succeeded: toolsSucceeded,
    tools_failed: toolsFailed,
    synthesis,
  };
}
