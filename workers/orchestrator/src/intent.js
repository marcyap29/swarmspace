// workers/orchestrator/src/intent.js
//
// Intent resolution for the SwarmSpace Orchestrator.
// Two-phase routing: resolveIntent (AI classification) + getRoutingTable (static metadata).
//
// No Firestore access — routing table is embedded. To update plugin availability,
// update this file and redeploy the orchestrator.

// ── Embedded routing table (mirrors swarmspaceRouter.ts PLUGIN_REGISTRY) ──
// Fields kept minimal: only what the orchestrator needs for routing decisions.

const ROUTING_TABLE = [
  { slug: "gemini-flash", capabilities: ["llm", "synthesis", "writing"], description: "Fast AI synthesis for writing and drafting", requiredTier: "free", latency_class: "standard", trust_tier: "verified", agent_guidance: "Use as the final synthesis step after data collection. Always chain last. Does not count against max plugin count." },
  { slug: "brave-search", capabilities: ["web_search", "general"], description: "Privacy-focused web search", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Primary web search for general queries, current events, and broad research. Fast and reliable." },
  { slug: "semantic-scholar", capabilities: ["academic_search", "research", "papers"], description: "Academic paper and citation search", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Academic paper and citation search. Use for scholarly research, bibliographic queries, and peer-reviewed sources." },
  { slug: "weather", capabilities: ["weather", "real_time"], description: "Current weather and forecasts", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Current weather and forecasts. Use for location-based weather queries only." },
  { slug: "wikipedia", capabilities: ["knowledge", "encyclopedia", "general"], description: "Wikipedia knowledge base", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "General knowledge and encyclopedic lookups. Use for broad factual context and background." },
  { slug: "currency", capabilities: ["currency", "exchange_rates", "real_time"], description: "Currency exchange rates", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Currency exchange rates and conversions. Use for financial rate queries only." },
  { slug: "news", capabilities: ["news", "real_time", "headlines"], description: "Latest news and headlines", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Latest news and headlines. Use for real-time news briefings and trending topics." },
  { slug: "arxiv", capabilities: ["academic_search", "preprints", "research"], description: "Scientific preprints from arXiv", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Scientific preprints from arXiv. Use for cutting-edge research, physics, CS, and math papers." },
  { slug: "pubmed", capabilities: ["biomedical", "research", "clinical"], description: "Biomedical literature from PubMed", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Biomedical literature from PubMed/NCBI. Use for clinical, health, and life-science research." },
  { slug: "nominatim", capabilities: ["geocoding", "location", "maps"], description: "Geocoding via OpenStreetMap", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Geocoding and location resolution via OpenStreetMap. Use for address/coordinate lookups." },
  { slug: "rest-countries", capabilities: ["geography", "country_data", "reference"], description: "Country data and geography", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Country data and geography. Use for demographic, cultural, and geographic reference." },
  { slug: "github-public", capabilities: ["developer_tools", "repositories", "open_source"], description: "Public GitHub repo and developer data", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Public GitHub repositories and developer data. Use for code discovery, stars, and repo metadata." },
  { slug: "hackernews", capabilities: ["tech_news", "community", "discussions"], description: "Tech community discussions from Hacker News", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Tech community discussions from Hacker News. Use for tech sentiment, startup buzz, and dev opinions." },
  { slug: "dictionary-api", capabilities: ["language", "definitions", "reference"], description: "Word definitions and etymology", requiredTier: "free", latency_class: "fast", trust_tier: "verified", agent_guidance: "Word definitions and etymology. Use for language, spelling, and vocabulary queries." },
  { slug: "jina-reader", capabilities: ["url_fetch", "content_extraction", "reading"], description: "Fetch and extract any URL content", requiredTier: "free", latency_class: "standard", trust_tier: "verified", agent_guidance: "Fetch and extract content from any URL. Use as fallback when a page blocks or is not in search indexes." },
  { slug: "vision-ocr", capabilities: ["vision", "ocr", "image_understanding"], description: "Extract text (OCR) or understand images with Vision API + Gemini", requiredTier: "standard", latency_class: "slow", trust_tier: "verified", agent_guidance: "Extract text (OCR) or understand images. Requires image data; use only when images are provided." },
  { slug: "url-reader", capabilities: ["url_fetch", "content_extraction", "reading"], description: "Fetch and extract content from URLs", requiredTier: "standard", latency_class: "standard", trust_tier: "verified", agent_guidance: "Fetch and extract content from URLs with higher fidelity than jina-reader. Use for detailed article extraction." },
  { slug: "media-upload", capabilities: ["media_host", "image_upload"], description: "Upload image and get a public URL (24h TTL)", requiredTier: "standard", latency_class: "standard", trust_tier: "verified", agent_guidance: "Upload images and get public URLs. Use when user provides images that need hosting before processing." },
  { slug: "tavily-search", capabilities: ["web_search", "ai_optimized", "research"], description: "AI-optimized search for research", requiredTier: "standard", latency_class: "standard", trust_tier: "verified", agent_guidance: "AI-optimized search for deep research. Use when standard web search is insufficient for technical topics." },
  { slug: "calendar-reader", capabilities: ["calendar", "scheduling", "meetings", "attendees"], description: "Read upcoming calendar events and attendee details from Google Calendar", requiredTier: "standard", latency_class: "slow", trust_tier: "verified", agent_guidance: "Read upcoming calendar events and attendee details. Requires Google Calendar OAuth consent. Use for meeting prep and scheduling." },
  { slug: "exa-search", capabilities: ["neural_search", "semantic", "research"], description: "Neural semantic search", requiredTier: "premium", latency_class: "standard", trust_tier: "verified", agent_guidance: "Neural semantic search. Use for finding conceptually similar content and research discovery." },
  { slug: "perplexity-sonar", capabilities: ["web_search", "answer_synthesis", "research"], description: "Real-time answer synthesis from the web", requiredTier: "premium", latency_class: "standard", trust_tier: "verified", agent_guidance: "Real-time answer synthesis from the web with citations. Use for complex questions requiring summarized evidence." },
];

// ── Default system prompt for intent resolution ──────────────────────────────

const SYSTEM_PROMPT = `You are a SwarmSpace Intent Classifier. Your job is to analyze a user's query, identify their intent, and suggest the best plugins to fulfill it.

You have access to the following SwarmSpace plugins:

${ROUTING_TABLE.map(p => `- ${p.slug}: ${p.description} [${p.capabilities.join(", ")}] (tier: ${p.requiredTier}, latency: ${p.latency_class}, trust: ${p.trust_tier})`).join("\n")}

Return ONLY valid JSON in this exact shape (no markdown, no explanation):
{
  "intent": "short intent label like 'research', 'weather', 'news_brief', 'academic_research', etc.",
  "confidence": 0.85,
  "suggested_plugins": ["brave-search", "wikipedia", "gemini-flash"]
}

Rules:
1. Suggest 2-5 plugins max, ordered by relevance (most important first).
2. For queries that need synthesis, always include "gemini-flash" as the LAST entry (it synthesizes results from other plugins).
3. For simple factual queries ("What's the weather?", "Define X"), 1-2 plugins may be enough.
4. Use the capabilities and descriptions above to decide relevance.
5. Return ONLY the JSON object — no markdown code blocks, no extra text.`;

// ── resolveIntent: AI classifier with fallback keyword search ────────────────

/**
 * Resolve a user query into an intent + suggested plugins.
 * @param {string} query — user input
 * @param {object} env — Worker env (must contain AI binding)
 * @returns {Promise<{intent:string, confidence:number, suggested_plugins:string[]}>}
 */
export async function resolveIntent(query, env) {
  if (!query || typeof query !== "string") {
    throw new TypeError("resolveIntent requires a non-empty string query");
  }
  if (!env?.AI) {
    throw new TypeError("resolveIntent requires env.AI (Workers AI binding)");
  }

  // Build the prompt
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `User query: "${query}"\n\nReturn JSON only.` },
  ];

  let response;
  try {
    response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages });
  } catch (err) {
    // AI unavailable — fall back to keyword search
    return keywordFallback(query);
  }

  let parsed;
  try {
    const text = response?.response ?? "";
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    // JSON parse failed — fall back to keyword search
    return keywordFallback(query);
  }

  // Validate shape
  if (!parsed || typeof parsed !== "object") {
    return keywordFallback(query);
  }
  const intent = typeof parsed.intent === "string" ? parsed.intent : "unknown";
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  const suggested = Array.isArray(parsed.suggested_plugins)
    ? parsed.suggested_plugins
        .filter((s) => typeof s === "string")
        .filter((s) => ROUTING_TABLE.some((r) => r.slug === s))
    : [];

  // Fallback if AI returned empty plugin list
  if (suggested.length === 0) {
    return keywordFallback(query);
  }

  return { intent, confidence, suggested_plugins: suggested };
}

// ── getRoutingTable: return simplified metadata for a plugin subset ────────

/**
 * Get routing metadata for a list of plugin slugs.
 * @param {string[]} slugs
 * @returns {object[]}
 */
export function getRoutingTable(slugs) {
  if (!Array.isArray(slugs)) return [];
  const set = new Set(slugs);
  return ROUTING_TABLE.filter((r) => set.has(r.slug));
}

// ── Keyword fallback (no-AI path) ────────────────────────────────────────────

const KEYWORD_MAP = [
  { keywords: ["weather", "forecast", "rain", "temperature", "sunny", "cloudy"], plugins: ["weather"] },
  { keywords: ["news", "headline", "breaking", "today"], plugins: ["news", "brave-search"] },
  { keywords: ["academic", "paper", "research", "citation", "journal", "peer review"], plugins: ["semantic-scholar", "arxiv", "pubmed"] },
  { keywords: ["health", "medical", "clinical", "disease", "symptom", "drug"], plugins: ["pubmed", "wikipedia", "semantic-scholar"] },
  { keywords: ["tech", "startup", "software", "github", "code", "repository"], plugins: ["github-public", "hackernews", "brave-search"] },
  { keywords: ["location", "city", "country", "map", "geography", "coords", "address"], plugins: ["nominatim", "rest-countries", "wikipedia"] },
  { keywords: ["currency", "exchange", "usd", "eur", "rate", "conversion"], plugins: ["currency"] },
  { keywords: ["definition", "define", "meaning", "word", "dictionary", "etymology"], plugins: ["dictionary-api", "wikipedia"] },
  { keywords: ["url", "read this", "article", "page", "website", "extract"], plugins: ["jina-reader", "url-reader"] },
  { keywords: ["image", "photo", "ocr", "text in image", "screenshot"], plugins: ["vision-ocr"] },
  { keywords: ["meeting", "calendar", "schedule", "event", "attendee"], plugins: ["calendar-reader"] },
  { keywords: ["competitor", "market", "industry", "competition"], plugins: ["brave-search", "news", "hackernews", "gemini-flash"] },
  { keywords: ["marketing", "content", "seo", "blog", "social media"], plugins: ["brave-search", "news", "gemini-flash"] },
  { keywords: ["fact check", "verify", "true or false", "claim"], plugins: ["brave-search", "wikipedia", "semantic-scholar", "dictionary-api", "gemini-flash"] },
  { keywords: ["write", "draft", "summarize", "synthesis", "create"], plugins: ["brave-search", "wikipedia", "gemini-flash"] },
];

function keywordFallback(query) {
  const q = query.toLowerCase();
  const matched = new Set();
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        for (const p of entry.plugins) matched.add(p);
        break;
      }
    }
  }
  const plugins = matched.size > 0 ? Array.from(matched) : ["brave-search", "wikipedia", "gemini-flash"];
  // Ensure gemini-flash is last
  const withoutGemini = plugins.filter((p) => p !== "gemini-flash");
  const result = withoutGemini;
  if (plugins.includes("gemini-flash")) result.push("gemini-flash");
  return { intent: "keyword_fallback", confidence: 0.4, suggested_plugins: result };
}

// ── Re-exports for convenience ─────────────────────────────────────────────
export { ROUTING_TABLE };
