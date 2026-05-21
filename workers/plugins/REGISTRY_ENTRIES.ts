// ── PLUGIN_REGISTRY additions for swarmspaceRouter.ts ──────────────────────────
// Add these entries to the PLUGIN_REGISTRY object in:
//   ARCv2.5/functions/src/functions/swarmspaceRouter.ts
//
// All 8 are free-tier plugins using public APIs (no API keys required
// except optional ones for higher rate limits).
// ────────────────────────────────────────────────────────────────────────────────

  // ── New free tier plugins ──────────────────────────────────────────────────
  "arxiv": {
    workerUrl: "https://swarmspace-plugin-arxiv.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["academic_search", "preprints", "research"],
    description: "Scientific preprints from arXiv",
    exampleQuery: "Recent LLM alignment papers",
  },
  "pubmed": {
    workerUrl: "https://swarmspace-plugin-pubmed.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["biomedical", "research", "clinical"],
    description: "Biomedical literature from PubMed/NCBI",
    exampleQuery: "Sleep and HRV studies",
  },
  "nominatim": {
    workerUrl: "https://swarmspace-plugin-nominatim.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["geocoding", "location", "maps"],
    description: "Geocoding via OpenStreetMap",
    exampleQuery: "Coords for La Jolla, CA",
  },
  "rest-countries": {
    workerUrl: "https://swarmspace-plugin-rest-countries.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["geography", "country_data", "reference"],
    description: "Country data and geography",
    exampleQuery: "Info about Japan",
  },
  "github-public": {
    workerUrl: "https://swarmspace-plugin-github-public.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["developer_tools", "repositories", "open_source"],
    description: "Public GitHub repo and developer data",
    exampleQuery: "Stars on bytedance/deer-flow",
  },
  "hackernews": {
    workerUrl: "https://swarmspace-plugin-hackernews.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["tech_news", "community", "discussions"],
    description: "Tech community discussions from Hacker News",
    exampleQuery: "HN posts about MCP today",
  },
  "dictionary-api": {
    workerUrl: "https://swarmspace-plugin-dictionary-api.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["language", "definitions", "reference"],
    description: "Word definitions and etymology",
    exampleQuery: "Define interoperability",
  },
  "jina-reader": {
    workerUrl: "https://swarmspace-plugin-jina-reader.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["url_fetch", "content_extraction", "reading"],
    description: "Fetch and extract any URL content",
    exampleQuery: "Read https://example.com",
  },
  "calendar-reader": {
    workerUrl: "https://swarmspace-plugin-calendar-reader.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["calendar", "scheduling", "meetings", "attendees"],
    description: "Read upcoming calendar events and attendee details from Google Calendar.",
    exampleQuery: "What meetings do I have today?",
    privacy_data_required: ["calendar_events", "attendee_names", "attendee_emails", "access_token"],
    privacyTier: "STRUCTURED_PERSONAL",
    dataTypes: ["calendar_events", "attendee_data"],
    rateLimits: { free: 0, standard: 500, premium: 500 },
    is_read_only: true,
    is_destructive: false,
    schedulable: true,
    headless: true,
  },
  "proxycurl": {
    workerUrl: "https://swarmspace-plugin-proxycurl.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["linkedin", "professional_profile", "person_lookup"],
    description: "Structured LinkedIn profile data via Proxycurl API",
    exampleQuery: "LinkedIn profile for Jane Smith at Stripe",
    privacy_data_required: ["attendee_name", "attendee_company", "professional_profile"],
    privacyTier: "STRUCTURED_PERSONAL",
    dataTypes: ["professional_profile", "employment_history", "education"],
    is_read_only: true,
    is_destructive: false,
    rateLimits: { free: 0, standard: 100, premium: 500 },
  },

// ── Deployment checklist ────────────────────────────────────────────────────
//
// For each plugin above:
//   1. cd workers/plugins/{plugin-id}
//   2. npx wrangler deploy
//   3. npx wrangler secret put SWARMSPACE_INTERNAL_TOKEN
//   4. (optional) Set additional secrets (GITHUB_TOKEN, NCBI_API_KEY, JINA_API_KEY)
//   5. Add the entry to PLUGIN_REGISTRY in swarmspaceRouter.ts
//   6. Deploy Firebase functions: firebase deploy --only functions
