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
      viaMcp: body._via_mcp || false,
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
  // When using the service-token bypass, omit the Authorization header.
  // Firebase Functions v2 rejects non-JWT Bearer tokens at the runtime level
  // before the function handler runs. The bypass relies on request.data._service_token
  // only — no Authorization header needed.
  if (ctx.serviceToken && ctx.runAsUid) {
    data._service_token = ctx.serviceToken;
    data._run_as_uid = ctx.runAsUid;
  }
  if (ctx.viaMcp) data._via_mcp = true;
  const headers = { 'Content-Type': 'application/json' };
  if (!ctx.serviceToken) {
    headers['Authorization'] = ctx.token;
  }
  const res = await fetch(ctx.routerUrl, {
    method: 'POST',
    headers,
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
  const attendeeName     = ctx.params.attendee_name    || '';
  const attendeeCompany  = ctx.params.attendee_company || '';
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

  if (!webEnabled) {
    const briefResult = await callPlugin(ctx, 'gemini-flash', {
      prompt: buildMeetingPrepPrompt({
        attendeeName, attendeeCompany, meetingTitle, meetingTime,
        durationMinutes, meetingLocation, chronicleCtx, documentSnippets,
        generalSearchResults: '', linkedInPageContent: '', deliverables,
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
    // Primary: Proxycurl structured lookup
    const proxycurlResult = await callPlugin(ctx, 'proxycurl', {
      name: attendeeName,
      company: attendeeCompany,
    });
    const proxycurlContent = proxycurlResult?.results?.[0]?.content || '';
    if (proxycurlContent.length > 100) {
      linkedInPageContent = proxycurlContent.slice(0, 3000);
    }
  } catch (_) { /* non-fatal — fall through to jina-reader */ }

  if (!linkedInPageContent) {
    try {
      // Fallback: Brave Search → jina-reader (often blocked but kept as backup)
      const linkedInSearch = await callPlugin(ctx, 'brave-search', {
        query: `${attendeeName} ${attendeeCompany} LinkedIn`,
        count: 4,
      });
      const linkedInUrl = extractLinkedInUrl(linkedInSearch);
      if (linkedInUrl) {
        const pageResult = await callPlugin(ctx, 'jina-reader', { url: linkedInUrl });
        const content = pageResult?.results?.[0]?.content || '';
        linkedInPageContent = content.length > 200 ? content.slice(0, 3000) : '';
      }
    } catch (_) { /* non-fatal */ }
  }

  const briefResult = await callPlugin(ctx, 'gemini-flash', {
    prompt: buildMeetingPrepPrompt({
      attendeeName, attendeeCompany, meetingTitle, meetingTime,
      durationMinutes, meetingLocation, chronicleCtx, documentSnippets,
      generalSearchResults: JSON.stringify(generalResults).slice(0, 2000),
      linkedInPageContent, deliverables,
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
  const deliverables = p.deliverables || ['brief'];

  const DELIVERABLE_INSTRUCTIONS = {
    brief: `## MEETING BRIEF
─────────────────────────────────
${p.meetingTitle || 'Upcoming meeting'}${p.meetingTime ? ' · ' + p.meetingTime : ''}${p.durationMinutes ? ' · ' + p.durationMinutes + ' min' : ''}${p.meetingLocation ? ' · ' + p.meetingLocation : ''}

**ATTENDEE:** ${p.attendeeName}${p.attendeeCompany ? ' at ' + p.attendeeCompany : ''}

**FROM YOUR NOTES**
[Bullet points from personal context only; omit this block entirely if personal context is empty]

**PERSON INTEL**
[3–5 factual bullet points from web research; omit if no web data]

**SUGGESTED TALKING POINTS**
[2–3 synthesis bullets connecting personal context with web intel; omit if insufficient data]`,

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

  return `You are preparing meeting documents. Use only the information provided below. Do not invent facts. Omit any field or block that has no supporting data.

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
