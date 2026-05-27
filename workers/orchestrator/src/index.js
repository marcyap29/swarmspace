// SwarmSpace Orchestration Worker
// Routes: /research, /competitor, /marketing, /plugins, /academic,
//         /news-brief, /market-scan, /location-brief, /health-research,
//         /tech-scout, /fact-check, /content-brief, /meeting-prep
//
// Each route chains multiple free-tier SwarmSpace plugins into a single
// workflow. Authenticated via Firebase ID token (passed through to
// swarmspaceRouter).
//
// DO-initiated calls (e.g. recurring News Briefing) carry _service_token +
// _run_as_uid in the body instead of a Firebase ID token; these are
// forwarded to swarmspaceRouter which validates the service token and
// runs the call as the named uid. Used by Durable Object alarms.

import { resolveIntent, getRoutingTable, ROUTING_TABLE } from './intent.js';
import { rankCandidates, assembleChain } from './rank.js';
import { callPlugin, parallel, executeChain } from './chain.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'POST required' }), 405);
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return corsResponse(JSON.stringify({ error: 'Missing Authorization header' }), 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON body' }), 400);
    }

    const ctx = {
      token: authHeader,
      routerUrl: env.SWARMSPACE_ROUTER_URL,
      query: body.query || body.topic || '',
      params: body,
      serviceToken: body._service_token || null,
      runAsUid: body._run_as_uid || null,
      viaMcp: body._via_mcp || false,
      env,
    };

    if (url.pathname === '/resolve-intent') {
      try {
        const intent = await resolveIntent(ctx.query, env);
        const details = getRoutingTable(intent.suggested_plugins);
        return corsResponse(JSON.stringify({ intent, plugins: details }), 200);
      } catch (err) {
        return corsResponse(JSON.stringify({ error: err.message }), 400);
      }
    }

    const routes = {
      '/research':       runResearchWorkflow,
      '/competitor':     runCompetitorWorkflow,
      '/marketing':      runMarketingWorkflow,
      '/plugins':        runPluginsWorkflow,
      '/academic':       runAcademicWorkflow,
      '/news-brief':     runNewsBriefWorkflow,
      '/market-scan':    runMarketScanWorkflow,
      '/location-brief': runLocationBriefWorkflow,
      '/health-research': runHealthResearchWorkflow,
      '/tech-scout':     runTechScoutWorkflow,
      '/fact-check':     runFactCheckWorkflow,
      '/content-brief':  runContentBriefWorkflow,
      '/meeting-prep':   runMeetingPrepWorkflow,
      '/decision-simulation': runDecisionSimulationWorkflow,
      '/dynamic':        runDynamicWorkflow,
    };

    const handler = routes[url.pathname];
    if (!handler) {
      return corsResponse(JSON.stringify({
        error: 'Unknown route',
        available: Object.keys(routes),
      }), 404);
    }

    try {
      const result = await handler(ctx);
      return corsResponse(JSON.stringify({ workflow: url.pathname, result }), 200);
    } catch (err) {
      return corsResponse(JSON.stringify({ error: err.message }), 500);
    }
  }
};


// ── CORS helper ──

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// ════════════════════════════════════════════════════════════════
// WORKFLOW IMPLEMENTATIONS
// ════════════════════════════════════════════════════════════════

// 1. /research — Deep research: web search + Wikipedia + academic papers
async function runResearchWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: q, count: 8 }],
    ['wikipedia', { query: q, mode: 'search', limit: 3 }],
    ['semantic-scholar', { query: q, limit: 5 }],
  ]);

  // Synthesize with Gemini Flash
  const synthesisResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Synthesize a research brief from these sources on "${q}":\n\nWeb results: ${JSON.stringify(results['brave-search'])}\n\nWikipedia: ${JSON.stringify(results['wikipedia'])}\n\nAcademic papers: ${JSON.stringify(results['semantic-scholar'])}\n\nProvide a structured summary with key findings, sources cited, and gaps in available information.`,
  });

  return { sources: results, synthesis: synthesisResult?.text || synthesisResult || '' };
}

// 2. /competitor — Competitive analysis: web search + news + synthesis
async function runCompetitorWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} competitor analysis market position`, count: 8 }],
    ['news', { query: q, count: 5 }],
    ['hackernews', { query: q, count: 5 }],
  ]);

  const synthesisResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a competitive intelligence brief for "${q}":\n\nWeb search: ${JSON.stringify(results['brave-search'])}\n\nNews: ${JSON.stringify(results['news'])}\n\nHacker News discussion: ${JSON.stringify(results['hackernews'])}\n\nStructure as: Overview, Key Players, Recent Moves, Community Sentiment, Strategic Implications.`,
  });

  return { sources: results, analysis: synthesisResult?.text || synthesisResult || '' };
}

// 3. /marketing — Content marketing brief: search + trends + draft
async function runMarketingWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} marketing trends content strategy`, count: 6 }],
    ['news', { query: q, count: 5 }],
  ]);

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a content marketing brief for "${q}":\n\nTrending content: ${JSON.stringify(results['brave-search'])}\n\nRecent news: ${JSON.stringify(results['news'])}\n\nOutput: 1) Key themes and angles, 2) Content calendar suggestions (3 post ideas with hooks), 3) SEO keywords to target, 4) Audience pain points to address.`,
  });

  return { research: results, brief: briefResult?.text || briefResult || '' };
}

// 4. /plugins — Plugin discovery: search existing ecosystem + gaps
async function runPluginsWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} API plugin integration`, count: 8 }],
    ['github-public', { query: q }],
  ]);

  const analysisResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Analyze the plugin/API ecosystem for "${q}":\n\nWeb results: ${JSON.stringify(results['brave-search'])}\n\nGitHub repos: ${JSON.stringify(results['github-public'])}\n\nOutput: 1) Existing APIs/plugins available, 2) Integration patterns, 3) Gaps and opportunities for new SwarmSpace plugins, 4) Recommended manifest structure for this capability.`,
  });

  return { sources: results, analysis: analysisResult?.text || analysisResult || '' };
}

// 5. /academic — Deep academic research: arXiv + PubMed + Semantic Scholar
async function runAcademicWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['semantic-scholar', { query: q, limit: 5 }],
    ['arxiv', { query: q, limit: 5 }],
    ['pubmed', { query: q, limit: 5 }],
  ]);

  const synthesisResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create an academic literature review on "${q}":\n\nSemantic Scholar: ${JSON.stringify(results['semantic-scholar'])}\n\narXiv preprints: ${JSON.stringify(results['arxiv'])}\n\nPubMed: ${JSON.stringify(results['pubmed'])}\n\nStructure as: Research Landscape, Key Papers, Methodological Trends, Open Questions, Suggested Reading Order.`,
  });

  return { papers: results, review: synthesisResult?.text || synthesisResult || '' };
}

// 6. /news-brief — Multi-source news briefing
async function runNewsBriefWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['news', { query: q, count: 8 }],
    ['hackernews', { query: q, count: 5 }],
    ['brave-search', { query: `${q} latest news today`, count: 5 }],
  ]);

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a news intelligence brief for "${q}":\n\nMainstream news: ${JSON.stringify(results['news'])}\n\nTech community: ${JSON.stringify(results['hackernews'])}\n\nWeb: ${JSON.stringify(results['brave-search'])}\n\nStructure as: Headlines Summary (3 bullets), Detailed Analysis, Community Reaction, What To Watch.`,
  });

  return { sources: results, brief: briefResult?.text || briefResult || '' };
}

// 7. /market-scan — Financial/market overview
async function runMarketScanWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} market analysis financial outlook`, count: 6 }],
    ['news', { query: `${q} market`, count: 5 }],
    ['currency', { base: ctx.params.currency || 'USD' }],
  ]);

  const scanResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a market scan for "${q}":\n\nMarket research: ${JSON.stringify(results['brave-search'])}\n\nFinancial news: ${JSON.stringify(results['news'])}\n\nExchange rates context: ${JSON.stringify(results['currency'])}\n\nStructure as: Market Overview, Key Metrics, Recent Developments, Risk Factors, Outlook.`,
  });

  return { data: results, scan: scanResult?.text || scanResult || '' };
}

// 8. /location-brief — Geographic intelligence
async function runLocationBriefWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['nominatim', { query: q }],
    ['weather', { query: q }],
    ['rest-countries', { query: q }],
    ['wikipedia', { query: q, mode: 'search', limit: 2 }],
  ]);

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a location intelligence brief for "${q}":\n\nGeocoding: ${JSON.stringify(results['nominatim'])}\n\nWeather: ${JSON.stringify(results['weather'])}\n\nCountry data: ${JSON.stringify(results['rest-countries'])}\n\nWikipedia: ${JSON.stringify(results['wikipedia'])}\n\nStructure as: Location Overview, Current Conditions, Key Facts, Context.`,
  });

  return { data: results, brief: briefResult?.text || briefResult || '' };
}

// 9. /health-research — Health and biomedical research
async function runHealthResearchWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['pubmed', { query: q, limit: 8 }],
    ['semantic-scholar', { query: q, limit: 5 }],
    ['wikipedia', { query: q, mode: 'search', limit: 2 }],
  ]);

  const synthesisResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a health research summary on "${q}":\n\nPubMed studies: ${JSON.stringify(results['pubmed'])}\n\nAcademic papers: ${JSON.stringify(results['semantic-scholar'])}\n\nWikipedia context: ${JSON.stringify(results['wikipedia'])}\n\nStructure as: Clinical Overview, Key Studies, Evidence Strength, Practical Implications. Add disclaimer that this is not medical advice.`,
  });

  return { papers: results, summary: synthesisResult?.text || synthesisResult || '' };
}

// 10. /tech-scout — Technology scouting and evaluation
async function runTechScoutWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['github-public', { query: q }],
    ['hackernews', { query: q, count: 8 }],
    ['brave-search', { query: `${q} technology comparison review`, count: 6 }],
    ['arxiv', { query: q, limit: 3 }],
  ]);

  const evaluationResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a technology evaluation for "${q}":\n\nGitHub ecosystem: ${JSON.stringify(results['github-public'])}\n\nHacker News sentiment: ${JSON.stringify(results['hackernews'])}\n\nWeb research: ${JSON.stringify(results['brave-search'])}\n\nAcademic papers: ${JSON.stringify(results['arxiv'])}\n\nStructure as: Technology Overview, Maturity Assessment, Community Adoption, Alternatives, Recommendation.`,
  });

  return { sources: results, evaluation: evaluationResult?.text || evaluationResult || '' };
}

// 11. /fact-check — Multi-source fact verification
async function runFactCheckWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: q, count: 8 }],
    ['wikipedia', { query: q, mode: 'search', limit: 3 }],
    ['semantic-scholar', { query: q, limit: 3 }],
    ['dictionary-api', { word: q.split(' ')[0] }],
  ]);

  const verdictResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Fact-check the following claim: "${q}"\n\nWeb sources: ${JSON.stringify(results['brave-search'])}\n\nWikipedia: ${JSON.stringify(results['wikipedia'])}\n\nAcademic sources: ${JSON.stringify(results['semantic-scholar'])}\n\nProvide: 1) Verdict (Supported / Partially Supported / Unsupported / Unverifiable), 2) Evidence For, 3) Evidence Against, 4) Source Quality Assessment, 5) Confidence Level.`,
  });

  return { sources: results, verdict: verdictResult?.text || verdictResult || '' };
}

// 12. /content-brief — Content creation brief with research
async function runContentBriefWorkflow(ctx) {
  const q = ctx.query;
  const format = ctx.params.format || 'blog post';
  const results = await parallel(ctx, [
    ['brave-search', { query: q, count: 6 }],
    ['wikipedia', { query: q, mode: 'search', limit: 2 }],
    ['news', { query: q, count: 3 }],
  ]);

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a content brief for a ${format} about "${q}":\n\nResearch: ${JSON.stringify(results['brave-search'])}\n\nBackground: ${JSON.stringify(results['wikipedia'])}\n\nRecent news: ${JSON.stringify(results['news'])}\n\nOutput: 1) Title Options (3), 2) Target Audience, 3) Key Points to Cover, 4) Outline (H2/H3 structure), 5) Data Points to Include, 6) Call to Action Suggestions.`,
  });

  return { research: results, brief: briefResult?.text || briefResult || '' };
}

// 13. /meeting-prep — Pre-meeting intelligence brief
// LUMARA assembles CHRONICLE + document context client-side and passes it
// as string params here. Only external lookups (web + LinkedIn) run inside
// SwarmSpace. Calendar reads (Standard tier) happen in LUMARA via
// swarmspaceRouter -> calendar-reader plugin BEFORE this route is invoked.
async function runMeetingPrepWorkflow(ctx) {
  const attendees = resolveAttendees(ctx.params);
  const meetingTitle     = ctx.params.meeting_title    || '';
  const meetingTime      = ctx.params.meeting_time     || '';
  const durationMinutes  = ctx.params.meeting_duration_minutes || 0;
  const meetingLocation  = ctx.params.meeting_location || '';
  const chronicleCtx     = ctx.params.chronicle_context    || '';
  const documentSnippets = ctx.params.document_snippets    || '';
  const webEnabled       = ctx.params.web_search_enabled !== false;
  const deliverables     = Array.isArray(ctx.params.deliverables) && ctx.params.deliverables.length > 0
    ? ctx.params.deliverables
    : ['brief'];

  const attendeeResearch = [];
  for (const attendee of attendees) {
    if (webEnabled) {
      attendeeResearch.push(await runAttendeeWebResearch(ctx, attendee));
    } else {
      attendeeResearch.push({
        attendee,
        generalSearchResults: '',
        linkedInPageContent: '',
      });
    }
  }

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: attendees.length === 1
      ? buildMeetingPrepPrompt({
          attendeeName: attendees[0].name,
          attendeeCompany: attendees[0].company,
          meetingTitle, meetingTime, durationMinutes, meetingLocation,
          chronicleCtx, documentSnippets,
          generalSearchResults: attendeeResearch[0].generalSearchResults,
          linkedInPageContent: attendeeResearch[0].linkedInPageContent,
          deliverables,
        })
      : buildMultiAttendeeMeetingPrepPrompt({
          attendees: attendeeResearch,
          meetingTitle, meetingTime, durationMinutes, meetingLocation,
          chronicleCtx, documentSnippets, deliverables,
        }),
  });

  return {
    brief: briefResult?.text || briefResult || '',
    attendees_processed: attendees.length,
  };
}

function resolveAttendees(params) {
  if (Array.isArray(params.attendees) && params.attendees.length > 0) {
    return params.attendees
      .slice(0, 5)
      .map((a) => ({
        name: (a && a.name) || '',
        company: (a && a.company) || '',
        title: (a && a.title) || '',
      }))
      .filter((a) => a.name.trim().length > 0);
  }

  const name = params.attendee_name || '';
  const company = params.attendee_company || '';
  if (name.trim().length > 0) {
    return [{ name, company, title: '' }];
  }
  return [];
}

async function runAttendeeWebResearch(ctx, attendee) {
  const attendeeName = attendee.name || '';
  const attendeeCompany = attendee.company || '';

  // Two sequential brave-search calls — parallel() keys results by plugin_id,
  // so two brave-search entries would overwrite each other. Keep them sequential.
  let generalResults = {};
  try {
    generalResults = await callPlugin(ctx, 'brave-search', {
      query: `${attendeeName} ${attendeeCompany}`.trim(),
      count: 6,
    });
  } catch (_) { /* non-fatal */ }

  let linkedInPageContent = '';
  try {
    const linkedInSearch = await callPlugin(ctx, 'brave-search', {
      query: `${attendeeName} ${attendeeCompany} LinkedIn`.trim(),
      count: 4,
    });
    const linkedInUrl = extractLinkedInUrl(linkedInSearch);
    if (linkedInUrl) {
      const pageResult = await callPlugin(ctx, 'jina-reader', { url: linkedInUrl });
      const content = pageResult?.results?.[0]?.content || '';
      // Only use if substantive — LinkedIn often blocks scrapers
      linkedInPageContent = content.length > 200 ? content.slice(0, 3000) : '';
    }
  } catch (_) { /* non-fatal */ }

  return {
    attendee,
    generalSearchResults: JSON.stringify(generalResults).slice(0, 2000),
    linkedInPageContent,
  };
}

// ── 14. /decision-simulation — Monte Carlo decision simulation ──────────────────
//
// Input (from LUMARA):
//   question, seed: { behavioral_profile, decision_patterns[] },
//   research (optional), branches[] (max 4), iterations (default 50, max 100)
//
// LLM call budget: ~12 total — agent extraction (1), agent stances (8),
//   boundary containers (2), synthesis (1). Monte Carlo is pure JS.
//
// Output: SimulationReport matching LUMARA's DecisionSimulationScreen schema.
async function runDecisionSimulationWorkflow(ctx) {
  const question  = ctx.params.question  || ctx.query || '';
  const seed      = ctx.params.seed      || {};
  const research  = ctx.params.research  || null;
  const branches  = Array.isArray(ctx.params.branches) && ctx.params.branches.length >= 2
    ? ctx.params.branches.slice(0, 4)
    : ['Do it', "Don't do it"];
  const iterations = Math.min(Number(ctx.params.iterations) || 50, 100);

  if (!question.trim()) {
    throw new Error('decision-simulation: question is required');
  }

  // ── Phase 1: Extract decision agents from seed ────────────────────────────
  const agentExtractionResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: buildAgentExtractionPrompt(question, seed, branches),
  });
  const agents = parseAgentsFromText(agentExtractionResult?.text || agentExtractionResult || '');

  // ── Phase 2: Agent Activity — stance probabilities per agent per branch ───
  const activityCalls = [];
  for (const agent of agents) {
    for (const branch of branches) {
      activityCalls.push({ agent, branch });
    }
  }
  const activityResults = await Promise.allSettled(
    activityCalls.map(({ agent, branch }) =>
      callPlugin(ctx, 'gemini-flash', {
        prompt: buildAgentActivityPrompt(agent, branch, question, seed, research),
      })
    )
  );

  const agentStances = {};
  activityCalls.forEach(({ agent, branch }, i) => {
    const raw = activityResults[i].status === 'fulfilled'
      ? (activityResults[i].value?.text || activityResults[i].value || '')
      : '';
    if (!agentStances[agent.id]) agentStances[agent.id] = {};
    agentStances[agent.id][branch] = parseStanceProbabilities(raw);
  });

  // ── Phase 3: Boundary containers — best and worst case ───────────────────
  const [bestResult, worstResult] = await Promise.allSettled([
    callPlugin(ctx, 'gemini-flash', {
      prompt: buildBoundaryPrompt('best', question, branches, agents, seed, research),
    }),
    callPlugin(ctx, 'gemini-flash', {
      prompt: buildBoundaryPrompt('worst', question, branches, agents, seed, research),
    }),
  ]);
  const bestCase  = bestResult.status  === 'fulfilled' ? (bestResult.value?.text  || '') : '';
  const worstCase = worstResult.status === 'fulfilled' ? (worstResult.value?.text || '') : '';

  // ── Phase 4: Monte Carlo — pure JS probability draw ───────────────────────
  const iterationRecords = runMonteCarlo({ agents, agentStances, branches, iterations });

  // ── Phase 5: Synthesise SimulationReport ─────────────────────────────────
  const synthesisResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: buildSynthesisPrompt(question, branches, iterationRecords, bestCase, worstCase, agents),
  });
  const synthesisText = synthesisResult?.text || synthesisResult || '';
  return parseSimulationReport(synthesisText, branches, iterationRecords);
}

// ── Decision Simulation helpers ─────────────────────────────────────────────────

function buildAgentExtractionPrompt(question, seed, branches) {
  return `You are extracting the key decision factors (agents) that will determine the outcome of this decision.

DECISION QUESTION: "${question}"
OPTIONS: ${branches.join(' vs ')}

USER BEHAVIORAL PROFILE:
${seed.behavioral_profile || '(none provided)'}

KNOWN PATTERNS:
${(seed.decision_patterns || []).join('\n') || '(none)'}

Extract 3-5 decision factors (agents) that most influence this decision. For each factor output exactly:
AGENT_ID: [lowercase_slug]
NAME: [Human-readable name]
INFLUENCE_WEIGHT: [0.1-1.0, must sum to ~1.0 across all agents]
DESCRIPTION: [One sentence]

Output ONLY the agent blocks, no other text.`;
}

function parseAgentsFromText(text) {
  const agents = [];
  const blocks = text.split(/AGENT_ID:/i).slice(1);
  for (const block of blocks) {
    const id     = (block.match(/^[\s]*([a-z_]+)/i) || [])[1]?.trim().toLowerCase() || `agent_${agents.length}`;
    const name   = (block.match(/NAME:\s*(.+)/i)    || [])[1]?.trim() || id;
    const weight = parseFloat((block.match(/INFLUENCE_WEIGHT:\s*([\d.]+)/i) || [])[1] || '0.5');
    const desc   = (block.match(/DESCRIPTION:\s*(.+)/i) || [])[1]?.trim() || '';
    agents.push({ id, name, influenceWeight: isNaN(weight) ? 0.5 : weight, description: desc });
  }
  const total = agents.reduce((s, a) => s + a.influenceWeight, 0) || 1;
  agents.forEach(a => { a.influenceWeight = a.influenceWeight / total; });
  return agents.length > 0 ? agents.slice(0, 5) : [
    { id: 'primary_factor', name: 'Primary factor', influenceWeight: 1.0, description: '' }
  ];
}

function buildAgentActivityPrompt(agent, branch, question, seed, research) {
  return `You are assessing how a key decision factor will influence a choice.

FACTOR: ${agent.name} - ${agent.description}
QUESTION: "${question}"
BRANCH BEING EVALUATED: "${branch}"

USER CONTEXT: ${seed.behavioral_profile || '(none)'}
${research ? `EXTERNAL CONTEXT: ${research.slice(0, 800)}` : ''}

Rate how "${agent.name}" will influence this branch:
SUPPORT: [0.0-1.0]
CONDITIONAL: [0.0-1.0]
RESIST: [0.0-1.0]
NEUTRAL: [0.0-1.0]
VOLATILE: [0.0-1.0]
TOP_CONCERN: [One sentence about the main risk or consideration]

All five probabilities must sum to 1.0. Output ONLY these lines, no other text.`;
}

function parseStanceProbabilities(text) {
  const get = (key) => parseFloat((text.match(new RegExp(`${key}:\\s*([\\d.]+)`, 'i')) || [])[1] || '0');
  const stances = {
    support:     get('SUPPORT'),
    conditional: get('CONDITIONAL'),
    resist:      get('RESIST'),
    neutral:     get('NEUTRAL'),
    volatile:    get('VOLATILE'),
  };
  const total = Object.values(stances).reduce((s, v) => s + v, 0) || 1;
  Object.keys(stances).forEach(k => { stances[k] = stances[k] / total; });
  const topConcern = (text.match(/TOP_CONCERN:\s*(.+)/i) || [])[1]?.trim() || '';
  return { ...stances, topConcern };
}

function buildBoundaryPrompt(type, question, branches, agents, seed, research) {
  const isOptimistic = type === 'best';
  return `You are constructing the ${isOptimistic ? 'BEST' : 'WORST'} case scenario boundary for a decision simulation.

QUESTION: "${question}"
OPTIONS: ${branches.join(' | ')}
KEY FACTORS: ${agents.map(a => a.name).join(', ')}
USER CONTEXT: ${seed.behavioral_profile || '(none)'}
${research ? `EXTERNAL CONTEXT: ${research.slice(0, 600)}` : ''}

Describe the ${isOptimistic ? 'most optimistic plausible outcome' : 'most pessimistic plausible outcome'} if this decision were made.
${isOptimistic ? 'All factors align favorably. Best realistic (not fantasy) outcome.' : 'All factors work against the decision. Worst realistic (not catastrophic) outcome.'}

Output: Which branch wins in this scenario and why (2-3 sentences). Be specific.`;
}

function runMonteCarlo({ agents, agentStances, branches, iterations }) {
  const records = [];
  const STANCES = ['support', 'conditional', 'resist', 'neutral', 'volatile'];
  const STANCE_SCORES = { support: 1.0, conditional: 0.6, resist: -0.5, neutral: 0.0, volatile: 0.3 };

  for (let i = 0; i < iterations; i++) {
    const branchScores = {};
    branches.forEach(b => { branchScores[b] = 0; });
    let pivotAgentId = null;
    let pivotContribution = -Infinity;

    for (const agent of agents) {
      for (const branch of branches) {
        const probs = agentStances[agent.id]?.[branch];
        if (!probs) continue;

        const draw = Math.random();
        let cumulative = 0;
        let drawnStance = 'neutral';
        for (const stance of STANCES) {
          cumulative += probs[stance] || 0;
          if (draw <= cumulative) { drawnStance = stance; break; }
        }

        const contribution = (STANCE_SCORES[drawnStance] || 0) * agent.influenceWeight;
        branchScores[branch] += contribution;

        if (Math.abs(contribution) > Math.abs(pivotContribution)) {
          pivotContribution = contribution;
          pivotAgentId = agent.id;
        }
      }
    }

    const winner = Object.entries(branchScores).sort((a, b) => b[1] - a[1])[0]?.[0] || branches[0];
    records.push({ winner, pivot: pivotAgentId, scores: { ...branchScores } });
  }
  return records;
}

function buildSynthesisPrompt(question, branches, records, bestCase, worstCase, agents) {
  const freq = {};
  branches.forEach(b => { freq[b] = 0; });
  records.forEach(r => { if (freq[r.winner] !== undefined) freq[r.winner]++; });
  const total = records.length || 1;
  const freqPct = Object.fromEntries(Object.entries(freq).map(([b, n]) => [b, (n / total).toFixed(2)]));

  const pivotCount = {};
  records.forEach(r => { if (r.pivot) pivotCount[r.pivot] = (pivotCount[r.pivot] || 0) + 1; });
  const topPivot = Object.entries(pivotCount).sort((a, b) => b[1] - a[1])[0]?.[0] || agents[0]?.id || '';
  const topPivotAgent = agents.find(a => a.id === topPivot) || agents[0];

  return `You are writing a decision simulation synthesis report.

QUESTION: "${question}"
SIMULATION RESULTS (${records.length} iterations):
${Object.entries(freqPct).map(([b, f]) => `  ${b}: ${(parseFloat(f)*100).toFixed(0)}% of iterations`).join('\n')}

MOST FREQUENT PIVOT FACTOR: ${topPivotAgent?.name || topPivot} (${topPivotAgent?.description || ''})

BEST CASE SCENARIO: ${bestCase.slice(0, 400)}
WORST CASE SCENARIO: ${worstCase.slice(0, 400)}

Write a SimulationReport. Output EXACTLY these fields, no other text:

MOST_LIKELY_BRANCH: [branch name]
MOST_LIKELY_FREQUENCY: [decimal 0.0-1.0]
MOST_LIKELY_DESCRIPTION: [2 sentences on why this branch dominates]
PIVOT_AGENT_ID: ${topPivot}
PIVOT_DESCRIPTION: [one sentence on what this factor is]
PIVOT_LEVERAGE: [one actionable sentence - what to do about this factor]
CROSSOVER_POINT: [condition that could flip the result, or NONE]
CONFIDENCE: [low/medium/high based on how tightly iterations clustered]
OUTLIER_1: [unusual scenario that appeared in <5% of iterations, or NONE]`;
}

function parseSimulationReport(text, branches, records) {
  const get = (key) => (text.match(new RegExp(`${key}:\\s*(.+)`, 'i')) || [])[1]?.trim() || '';

  const freq = {};
  branches.forEach(b => { freq[b] = 0; });
  records.forEach(r => { if (freq[r.winner] !== undefined) freq[r.winner]++; });
  const total = records.length || 1;
  const distribution = Object.fromEntries(Object.entries(freq).map(([b, n]) => [b, parseFloat((n/total).toFixed(3))]));

  const mostLikelyBranch    = get('MOST_LIKELY_BRANCH')    || branches[0];
  const mostLikelyFrequency = parseFloat(get('MOST_LIKELY_FREQUENCY') || '0.5');
  const outlier = get('OUTLIER_1');

  return {
    most_likely_outcome: {
      branch:      mostLikelyBranch,
      frequency:   isNaN(mostLikelyFrequency) ? 0.5 : mostLikelyFrequency,
      description: get('MOST_LIKELY_DESCRIPTION'),
    },
    pivot_agent: {
      agent_id:        get('PIVOT_AGENT_ID'),
      description:     get('PIVOT_DESCRIPTION'),
      leverage_action: get('PIVOT_LEVERAGE'),
    },
    crossover_point:    get('CROSSOVER_POINT') === 'NONE' ? null : get('CROSSOVER_POINT') || null,
    confidence:         (['low','medium','high'].includes(get('CONFIDENCE').toLowerCase()) ? get('CONFIDENCE').toLowerCase() : 'low'),
    branch_distribution: distribution,
    outlier_scenarios:  outlier && outlier !== 'NONE' ? [outlier] : [],
  };
}

// ── Dynamic pipeline: two-phase intent + ranking ──────────────────────────────

const defaultPolicy = {
  max_plugins: 4,
  user_tier: 'free',
  require_consensus: false,
};

async function runDynamicWorkflow(ctx) {
  const policy = {
    ...defaultPolicy,
    ...(ctx.params.policy || {}),
  };
  const userTier = ctx.params.user_tier || policy.user_tier;
  const q = ctx.query;

  const intent = await resolveIntent(q, ctx.env);
  const ranked = rankCandidates(ROUTING_TABLE, intent, userTier, {
    maxCandidates: policy.max_plugins,
  });
  const chain = assembleChain(ranked, { maxLength: policy.max_plugins });

  const results = await executeChain(ctx, chain, ctx.params);

  return {
    intent,
    chain,
    ranked: ranked.map((p) => ({ slug: p.slug, score: p.score })),
    results,
  };
}

function extractLinkedInUrl(searchResult) {
  try {
    const str = JSON.stringify(searchResult);
    const match = str.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^"\s]+/);
    return match ? match[0] : null;
  } catch (_) { return null; }
}

function buildMeetingPrepPrompt(p) {
  const deliverables = p.deliverables || ['brief'];

  const DELIVERABLE_INSTRUCTIONS = {
    brief: `## MEETING BRIEF
─────────────────────────────────
${p.meetingTitle || 'Upcoming meeting'}${p.meetingTime ? ' · ' + p.meetingTime : ''}${p.durationMinutes ? ' · ' + p.durationMinutes + ' min' : ''}${p.meetingLocation ? ' · ' + p.meetingLocation : ''}

**ATTENDEE:** ${p.attendeeName}${p.attendeeCompany ? ' at ' + p.attendeeCompany : ''}

**FROM YOUR NOTES**
[Bullet points drawn only from the personal context provided. Omit this section entirely if personal context is empty.]

**WHAT MATTERS NOW**
[3–5 bullet points of current intelligence: recent news, role changes, funding rounds, product launches, or anything time-sensitive about this person or their company. Each bullet must cite its source as (source: <url>). Omit if no web data.]

**SUGGESTED TALKING POINTS**
[2–3 synthesis bullets connecting personal context with current intel. Omit if insufficient data.]`,

    talking_points: `## TALKING POINTS
─────────────────────────────────
[A structured list of 5–8 specific discussion points for this meeting. Each point should be actionable and grounded in the provided context. Group into: Opening, Core Discussion, and Close.]`,

    follow_up_email: `## FOLLOW-UP EMAIL DRAFT
─────────────────────────────────
Subject: [concise subject line]

[Draft a professional follow-up email from the user to ${p.attendeeName}. Reference the meeting context and any relevant notes. Keep it under 150 words. Leave [ACTION ITEM] placeholders where specifics are unknown.]`,

    one_pager: `## ONE-PAGER
─────────────────────────────────
**Who they are:** [1–2 sentence summary of ${p.attendeeName} and their role]

**Their company:** [2–3 sentences on ${p.attendeeCompany || 'their company'}: what they do, size/stage if known, recent news]

**Why this meeting matters:** [1–2 sentences on the strategic relevance based on user's notes]

**Key facts to remember:** [3–4 bullet points; most memorable or useful facts from web research]`,

    questions: `## QUESTIONS TO ASK
─────────────────────────────────
[8–10 thoughtful questions tailored to this specific meeting. Mix of: understanding their situation, uncovering needs, exploring fit, and building rapport. Base questions on the provided context — do not invent details.]`,
  };

  const sections = deliverables
    .filter(d => DELIVERABLE_INSTRUCTIONS[d])
    .map(d => DELIVERABLE_INSTRUCTIONS[d])
    .join('\n\n');

  return `You are preparing meeting documents. Use only the information provided below. Do not invent facts. Omit any field or block that has no supporting data. When citing web sources, use the format (source: <url>).

MEETING: ${p.meetingTitle || 'Upcoming meeting'} · ${p.meetingTime || ''} · ${p.durationMinutes ? p.durationMinutes + ' min' : ''} · ${p.meetingLocation || ''}
ATTENDEE: ${p.attendeeName}${p.attendeeCompany ? ' at ' + p.attendeeCompany : ''}

PERSONAL CONTEXT (user's own notes and documents — highest priority):
${p.chronicleCtx || '(none)'}
${p.documentSnippets || ''}

WEB RESEARCH:
${p.generalSearchResults || '(none)'}

LinkedIn profile content:
${p.linkedInPageContent || '(not available)'}

---
Produce exactly the following deliverables in order. Use the exact headings shown. Omit any sub-section that has no data.

${sections}`;
}

function buildMultiAttendeeMeetingPrepPrompt(p) {
  const deliverables = p.deliverables || ['brief'];
  const attendeeBlocks = (p.attendees || []).map((entry) => {
    const a = entry.attendee || {};
    const label = `${a.name || 'Unknown'}${a.company ? ' at ' + a.company : ''}${a.title ? ' (' + a.title + ')' : ''}`;
    return `### ${label}
WEB RESEARCH:
${entry.generalSearchResults || '(none)'}

LinkedIn profile content:
${entry.linkedInPageContent || '(not available)'}`;
  }).join('\n\n');

  const DELIVERABLE_INSTRUCTIONS = {
    brief: `## MEETING BRIEF
─────────────────────────────────
${p.meetingTitle || 'Upcoming meeting'}${p.meetingTime ? ' · ' + p.meetingTime : ''}${p.durationMinutes ? ' · ' + p.durationMinutes + ' min' : ''}${p.meetingLocation ? ' · ' + p.meetingLocation : ''}

For each attendee, include a subsection with their name and company as a heading.

**FROM YOUR NOTES**
[Bullet points drawn only from the personal context provided. Use [ATTENDEE: Name @ Company] headers in the context to attribute notes. Omit if empty.]

**WHAT MATTERS NOW**
[Per-attendee current intelligence with (source: <url>) citations. Omit if no web data.]

**SUGGESTED TALKING POINTS**
[Cross-attendee synthesis connecting personal context with current intel.]`,

    talking_points: `## TALKING POINTS
─────────────────────────────────
[5–8 discussion points covering all attendees. Group by attendee where helpful.]`,

    follow_up_email: `## FOLLOW-UP EMAIL DRAFT
─────────────────────────────────
Subject: [concise subject line]

[Professional follow-up email referencing the meeting and all attendees. Under 200 words.]`,

    one_pager: `## ONE-PAGER
─────────────────────────────────
[One page covering each attendee: who they are, their company, why the meeting matters.]`,

    questions: `## QUESTIONS TO ASK
─────────────────────────────────
[8–10 thoughtful questions tailored to this multi-attendee meeting.]`,
  };

  const sections = deliverables
    .filter((d) => DELIVERABLE_INSTRUCTIONS[d])
    .map((d) => DELIVERABLE_INSTRUCTIONS[d])
    .join('\n\n');

  return `You are preparing meeting documents for a meeting with multiple attendees. Use only the information provided below. Do not invent facts. Omit any field or block that has no supporting data. When citing web sources, use the format (source: <url>).

MEETING: ${p.meetingTitle || 'Upcoming meeting'} · ${p.meetingTime || ''} · ${p.durationMinutes ? p.durationMinutes + ' min' : ''} · ${p.meetingLocation || ''}
ATTENDEES: ${(p.attendees || []).length}

PERSONAL CONTEXT (user's own notes and documents — highest priority):
${p.chronicleCtx || '(none)'}
${p.documentSnippets || ''}

PER-ATTENDEE WEB RESEARCH:
${attendeeBlocks || '(none)'}

---
Produce exactly the following deliverables in order. Use the exact headings shown. Cover all attendees in a single combined brief. Omit any sub-section that has no data.

${sections}`;
}
