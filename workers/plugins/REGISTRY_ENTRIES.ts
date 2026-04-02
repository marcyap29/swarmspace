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

// ── Deployment checklist ────────────────────────────────────────────────────
//
// For each plugin above:
//   1. cd workers/plugins/{plugin-id}
//   2. npx wrangler deploy
//   3. npx wrangler secret put SWARMSPACE_INTERNAL_TOKEN
//   4. (optional) Set additional secrets (GITHUB_TOKEN, NCBI_API_KEY, JINA_API_KEY)
//   5. Add the entry to PLUGIN_REGISTRY in swarmspaceRouter.ts
//   6. Deploy Firebase functions: firebase deploy --only functions
