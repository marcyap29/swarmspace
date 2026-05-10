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
    };

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

// ── Helper: call a single plugin via swarmspaceRouter ──

async function callPlugin(ctx, pluginId, params) {
  // _prism_consent: true — user consented by initiating the workflow.
  // This is a first-party orchestrator; consent is implicit in the trigger.
  const data = { plugin_id: pluginId, params: { ...params, _prism_consent: true } };
  // DO-initiated calls (alarm-fired): propagate service-token + run-as-uid.
  // swarmspaceRouter validates the token and bypasses Firebase ID-token auth.
  if (ctx.serviceToken && ctx.runAsUid) {
    data._service_token = ctx.serviceToken;
    data._run_as_uid = ctx.runAsUid;
  }
  const res = await fetch(ctx.routerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ctx.token,
    },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plugin ${pluginId} failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.result || json;
}

// ── Helper: run plugins in parallel ──

async function parallel(ctx, calls) {
  const results = await Promise.allSettled(
    calls.map(([pluginId, params]) => callPlugin(ctx, pluginId, params))
  );
  const out = {};
  calls.forEach(([pluginId], i) => {
    const r = results[i];
    out[pluginId] = r.status === 'fulfilled' ? r.value : { error: r.reason.message };
  });
  return out;
}

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
  const synthesis = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Synthesize a research brief from these sources on "${q}":\n\nWeb results: ${JSON.stringify(results['brave-search'])}\n\nWikipedia: ${JSON.stringify(results['wikipedia'])}\n\nAcademic papers: ${JSON.stringify(results['semantic-scholar'])}\n\nProvide a structured summary with key findings, sources cited, and gaps in available information.`,
  });

  return { sources: results, synthesis };
}

// 2. /competitor — Competitive analysis: web search + news + synthesis
async function runCompetitorWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} competitor analysis market position`, count: 8 }],
    ['news', { query: q, count: 5 }],
    ['hackernews', { query: q, count: 5 }],
  ]);

  const synthesis = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a competitive intelligence brief for "${q}":\n\nWeb search: ${JSON.stringify(results['brave-search'])}\n\nNews: ${JSON.stringify(results['news'])}\n\nHacker News discussion: ${JSON.stringify(results['hackernews'])}\n\nStructure as: Overview, Key Players, Recent Moves, Community Sentiment, Strategic Implications.`,
  });

  return { sources: results, analysis: synthesis };
}

// 3. /marketing — Content marketing brief: search + trends + draft
async function runMarketingWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} marketing trends content strategy`, count: 6 }],
    ['news', { query: q, count: 5 }],
  ]);

  const brief = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a content marketing brief for "${q}":\n\nTrending content: ${JSON.stringify(results['brave-search'])}\n\nRecent news: ${JSON.stringify(results['news'])}\n\nOutput: 1) Key themes and angles, 2) Content calendar suggestions (3 post ideas with hooks), 3) SEO keywords to target, 4) Audience pain points to address.`,
  });

  return { research: results, brief };
}

// 4. /plugins — Plugin discovery: search existing ecosystem + gaps
async function runPluginsWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} API plugin integration`, count: 8 }],
    ['github-public', { query: q }],
  ]);

  const analysis = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Analyze the plugin/API ecosystem for "${q}":\n\nWeb results: ${JSON.stringify(results['brave-search'])}\n\nGitHub repos: ${JSON.stringify(results['github-public'])}\n\nOutput: 1) Existing APIs/plugins available, 2) Integration patterns, 3) Gaps and opportunities for new SwarmSpace plugins, 4) Recommended manifest structure for this capability.`,
  });

  return { sources: results, analysis };
}

// 5. /academic — Deep academic research: arXiv + PubMed + Semantic Scholar
async function runAcademicWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['semantic-scholar', { query: q, limit: 5 }],
    ['arxiv', { query: q, limit: 5 }],
    ['pubmed', { query: q, limit: 5 }],
  ]);

  const synthesis = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create an academic literature review on "${q}":\n\nSemantic Scholar: ${JSON.stringify(results['semantic-scholar'])}\n\narXiv preprints: ${JSON.stringify(results['arxiv'])}\n\nPubMed: ${JSON.stringify(results['pubmed'])}\n\nStructure as: Research Landscape, Key Papers, Methodological Trends, Open Questions, Suggested Reading Order.`,
  });

  return { papers: results, review: synthesis };
}

// 6. /news-brief — Multi-source news briefing
async function runNewsBriefWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['news', { query: q, count: 8 }],
    ['hackernews', { query: q, count: 5 }],
    ['brave-search', { query: `${q} latest news today`, count: 5 }],
  ]);

  const brief = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a news intelligence brief for "${q}":\n\nMainstream news: ${JSON.stringify(results['news'])}\n\nTech community: ${JSON.stringify(results['hackernews'])}\n\nWeb: ${JSON.stringify(results['brave-search'])}\n\nStructure as: Headlines Summary (3 bullets), Detailed Analysis, Community Reaction, What To Watch.`,
  });

  return { sources: results, brief };
}

// 7. /market-scan — Financial/market overview
async function runMarketScanWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['brave-search', { query: `${q} market analysis financial outlook`, count: 6 }],
    ['news', { query: `${q} market`, count: 5 }],
    ['currency', { base: ctx.params.currency || 'USD' }],
  ]);

  const scan = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a market scan for "${q}":\n\nMarket research: ${JSON.stringify(results['brave-search'])}\n\nFinancial news: ${JSON.stringify(results['news'])}\n\nExchange rates context: ${JSON.stringify(results['currency'])}\n\nStructure as: Market Overview, Key Metrics, Recent Developments, Risk Factors, Outlook.`,
  });

  return { data: results, scan };
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

  const brief = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a location intelligence brief for "${q}":\n\nGeocoding: ${JSON.stringify(results['nominatim'])}\n\nWeather: ${JSON.stringify(results['weather'])}\n\nCountry data: ${JSON.stringify(results['rest-countries'])}\n\nWikipedia: ${JSON.stringify(results['wikipedia'])}\n\nStructure as: Location Overview, Current Conditions, Key Facts, Context.`,
  });

  return { data: results, brief };
}

// 9. /health-research — Health and biomedical research
async function runHealthResearchWorkflow(ctx) {
  const q = ctx.query;
  const results = await parallel(ctx, [
    ['pubmed', { query: q, limit: 8 }],
    ['semantic-scholar', { query: q, limit: 5 }],
    ['wikipedia', { query: q, mode: 'search', limit: 2 }],
  ]);

  const synthesis = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a health research summary on "${q}":\n\nPubMed studies: ${JSON.stringify(results['pubmed'])}\n\nAcademic papers: ${JSON.stringify(results['semantic-scholar'])}\n\nWikipedia context: ${JSON.stringify(results['wikipedia'])}\n\nStructure as: Clinical Overview, Key Studies, Evidence Strength, Practical Implications. Add disclaimer that this is not medical advice.`,
  });

  return { papers: results, summary: synthesis };
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

  const evaluation = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a technology evaluation for "${q}":\n\nGitHub ecosystem: ${JSON.stringify(results['github-public'])}\n\nHacker News sentiment: ${JSON.stringify(results['hackernews'])}\n\nWeb research: ${JSON.stringify(results['brave-search'])}\n\nAcademic papers: ${JSON.stringify(results['arxiv'])}\n\nStructure as: Technology Overview, Maturity Assessment, Community Adoption, Alternatives, Recommendation.`,
  });

  return { sources: results, evaluation };
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

  const verdict = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Fact-check the following claim: "${q}"\n\nWeb sources: ${JSON.stringify(results['brave-search'])}\n\nWikipedia: ${JSON.stringify(results['wikipedia'])}\n\nAcademic sources: ${JSON.stringify(results['semantic-scholar'])}\n\nProvide: 1) Verdict (Supported / Partially Supported / Unsupported / Unverifiable), 2) Evidence For, 3) Evidence Against, 4) Source Quality Assessment, 5) Confidence Level.`,
  });

  return { sources: results, verdict };
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

  const brief = await callPlugin(ctx, 'gemini-flash', {
    prompt: `Create a content brief for a ${format} about "${q}":\n\nResearch: ${JSON.stringify(results['brave-search'])}\n\nBackground: ${JSON.stringify(results['wikipedia'])}\n\nRecent news: ${JSON.stringify(results['news'])}\n\nOutput: 1) Title Options (3), 2) Target Audience, 3) Key Points to Cover, 4) Outline (H2/H3 structure), 5) Data Points to Include, 6) Call to Action Suggestions.`,
  });

  return { research: results, brief };
}

// 13. /meeting-prep — Pre-meeting intelligence brief
// LUMARA assembles CHRONICLE + document context client-side and passes it
// as string params here. Only external lookups (web + LinkedIn) run inside
// SwarmSpace. Calendar reads (Standard tier) happen in LUMARA via
// swarmspaceRouter -> calendar-reader plugin BEFORE this route is invoked.
async function runMeetingPrepWorkflow(ctx) {
  const attendeeName     = ctx.params.attendee_name    || '';
  const attendeeCompany  = ctx.params.attendee_company || '';
  const meetingTitle     = ctx.params.meeting_title    || '';
  const meetingTime      = ctx.params.meeting_time     || '';
  const durationMinutes  = ctx.params.meeting_duration_minutes || 0;
  const meetingLocation  = ctx.params.meeting_location || '';
  const chronicleCtx     = ctx.params.chronicle_context    || '';
  const documentSnippets = ctx.params.document_snippets    || '';
  const webEnabled       = ctx.params.web_search_enabled !== false;

  if (!webEnabled) {
    const briefResult = await callPlugin(ctx, 'gemini-flash', {
      prompt: buildMeetingPrepPrompt({
        attendeeName, attendeeCompany, meetingTitle, meetingTime,
        durationMinutes, meetingLocation, chronicleCtx, documentSnippets,
        generalSearchResults: '', linkedInPageContent: '',
      }),
    });
    return { brief: briefResult?.text || briefResult || '' };
  }

  // Two sequential brave-search calls — parallel() keys results by plugin_id,
  // so two brave-search entries would overwrite each other. Keep them sequential.
  let generalResults = {};
  try {
    generalResults = await callPlugin(ctx, 'brave-search', {
      query: `${attendeeName} ${attendeeCompany}`,
      count: 6,
    });
  } catch (_) { /* non-fatal */ }

  let linkedInPageContent = '';
  try {
    const linkedInSearch = await callPlugin(ctx, 'brave-search', {
      query: `${attendeeName} ${attendeeCompany} LinkedIn`,
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

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: buildMeetingPrepPrompt({
      attendeeName, attendeeCompany, meetingTitle, meetingTime,
      durationMinutes, meetingLocation, chronicleCtx, documentSnippets,
      generalSearchResults: JSON.stringify(generalResults).slice(0, 2000),
      linkedInPageContent,
    }),
  });

  return { brief: briefResult?.text || briefResult || '' };
}

function extractLinkedInUrl(searchResult) {
  try {
    const str = JSON.stringify(searchResult);
    const match = str.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^"\s]+/);
    return match ? match[0] : null;
  } catch (_) { return null; }
}

function buildMeetingPrepPrompt(p) {
  return `You are preparing a meeting brief. Use only the information provided. Do not invent facts. If a section has no data, omit it entirely.

MEETING: ${p.meetingTitle || 'Upcoming meeting'} · ${p.meetingTime || ''} · ${p.durationMinutes ? p.durationMinutes + ' min' : ''} · ${p.meetingLocation || ''}
ATTENDEE: ${p.attendeeName} at ${p.attendeeCompany}

PERSONAL CONTEXT (user's own notes and documents — highest priority):
${p.chronicleCtx || '(none)'}
${p.documentSnippets || ''}

WEB RESEARCH:
${p.generalSearchResults || '(none)'}

LinkedIn profile content:
${p.linkedInPageContent || '(not available)'}

---
Produce a brief in exactly this format. Omit any section that has no supporting data.

MEETING BRIEF
─────────────────────────────────
[meeting title] · [date and time] · [duration] minutes
[location or video link if available]

ATTENDEE: [full name], [title if found] at [company]

FROM YOUR NOTES
[bullet points from personal context only; omit this section if personal context is empty]

PERSON INTEL
[3–5 factual bullet points from web research; omit if no web data]

SUGGESTED TALKING POINTS
[2–3 bullet points synthesizing personal context with web intel; omit if insufficient data]`;
}
