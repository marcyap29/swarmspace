// functions/src/functions/swarmspaceRouter.ts
//
// SwarmSpace API Router — Firebase Cloud Function
//
// This is the "front door" to SwarmSpace. LUMARA calls this function,
// which checks who the user is, what plan they're on, then forwards
// the request to the right Cloudflare plugin worker.
//
// Flow:
//   LUMARA app
//     → Firebase Auth token (proves user identity)
//     → This function (swarmspaceRouter)
//         → Validate token (Firebase does this automatically)
//         → Load user from Firestore, check their plan
//         → Look up which worker URL handles the requested plugin
//         → Forward request to that worker, stamping it with:
//             - X-SwarmSpace-User-Id   (user's Firebase UID)
//             - X-SwarmSpace-User-Tier (free / standard / premium)
//             - Authorization: Bearer <SWARMSPACE_INTERNAL_TOKEN>
//         → Return the worker's response to LUMARA

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { enforceAuth, isAdminEmail } from "../authGuard";
import { loadUserLlmSettings } from "../userLlmSettings";
import { LLM_SETTINGS_ENCRYPTION_KEY } from "../config";
// ── Inline PRISM privacy types (from lib/types/privacy-tiers.ts) ────────────
enum PrivacyTier {
  ANONYMOUS = "anonymous",
  USER_CONTENT = "user_content",
  STRUCTURED_PERSONAL = "structured_personal",
}
function requiresUserConsent(tier: PrivacyTier): boolean {
  return tier !== PrivacyTier.ANONYMOUS;
}

const PLUGIN_ACTIVITY_COLLECTION = "plugin_activity_log";
const CATALOG_VERSION = "2026-04-10T18:00:00Z";

// ── Secrets ────────────────────────────────────────────────────────────────────
// Set these once via Firebase CLI:
//   firebase functions:secrets:set SWARMSPACE_INTERNAL_TOKEN
//   firebase functions:secrets:set GITHUB_TOKEN
//   firebase functions:secrets:set JINA_API_KEY
//   firebase functions:secrets:set NCBI_API_KEY
//
// SWARMSPACE_INTERNAL_TOKEN: shared secret between the router and workers.
// Workers reject requests without it — prevents direct calls that bypass auth/quota.
//
// GITHUB_TOKEN, JINA_API_KEY, NCBI_API_KEY: injected per-request into plugin
// workers so workers never hold secrets in their own env (credential isolation).
// All three are optional — workers fall back to unauthenticated if empty.
const SWARMSPACE_INTERNAL_TOKEN = defineSecret("SWARMSPACE_INTERNAL_TOKEN");
const GITHUB_TOKEN = defineSecret("GITHUB_TOKEN");
const JINA_API_KEY = defineSecret("JINA_API_KEY");
const NCBI_API_KEY = defineSecret("NCBI_API_KEY");

// ── Plugin registry ────────────────────────────────────────────────────────────
// Maps plugin_id → { workerUrl, requiredTier, capabilities, description, exampleQuery }
// Add new plugins here as you deploy them.
//
// 'free'     = available to all signed-in users
// 'standard' = requires paid plan ($30/mo)
// 'premium'  = requires premium plan (future)
//
// capabilities: used by orchestrator to route "what can I answer with this plugin?"

type Tier = "free" | "standard" | "premium";

interface PluginConfig {
  workerUrl: string;
  requiredTier: Tier;
  capabilities: string[];
  description: string;
  exampleQuery: string;
  /** Optional: for future cost-aware routing */
  costTier?: Tier;
  /** PRISM: dot-notation CHRONICLE field names this plugin needs access to. [] = no personal data. */
  privacy_data_required: string[];
  /** Privacy tier derived from privacy_data_required classification */
  privacyTier: PrivacyTier;
  /** Data type categories this plugin processes */
  dataTypes: string[];
  owner: string;
  author: { name: string; type: "first-party" | "developer" };
  pricing: { model: "included" | "per_call" | "subscription"; cost_per_call: number | null };
  version: string;
  deployed_at: string;
  rateLimits: { free: number; standard: number; premium: number | null };
  source?: "first-party" | "developer";
  /** Manifest behavioral fields (forward-looking; see §22 + §6 of backlog). */
  is_read_only?: boolean;
  is_destructive?: boolean;
  /** Verified-only: declares plugin is safe to run on schedule (DO recurring agents). */
  schedulable?: boolean;
  /** Verified-only: declares plugin runs without user-approval step (auto execution mode). */
  headless?: boolean;
  /** One-sentence instruction for AI agents on when to use this plugin. */
  agent_guidance: string;
  /** Typical latency class for routing decisions. */
  latency_class: "fast" | "standard" | "slow";
  /** Trust tier: verified (first-party), community (developer), experimental. */
  trust_tier: "verified" | "community" | "experimental";
}

const PLUGIN_REGISTRY: Record<string, PluginConfig> = {
  // ── Free tier ──────────────────────────────────────────────────────────────
  // IMPORTANT: The gemini-flash worker must use model gemini-3-flash-preview so it
  // matches proxyGemini and visionOcrInvoke. See DOCS/SWARMSPACE_GEMINI_MODEL_ALIGNMENT.md.
  "gemini-flash": {
    workerUrl: "https://swarmspace-plugin-gemini-flash.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["llm", "synthesis", "writing"],
    description: "Fast AI synthesis for writing and drafting",
    exampleQuery: "Draft a LinkedIn post about my latest project",
    privacy_data_required: ["user_text", "queries", "prompt"],
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_text", "queries", "prompt"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Use as the final synthesis step after data collection. Always chain last. Does not count against max plugin count.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "brave-search": {
    workerUrl: "https://swarmspace-plugin-brave-search.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["web_search", "general"],
    description: "Privacy-focused web search",
    exampleQuery: "What are the latest developments in AI?",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Primary web search for general queries, current events, and broad research. Fast and reliable.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "semantic-scholar": {
    workerUrl: "https://swarmspace-plugin-semantic-scholar.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["academic_search", "research", "papers"],
    description: "Academic paper and citation search",
    exampleQuery: "Find papers on transformer architectures",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Academic paper and citation search. Use for scholarly research, bibliographic queries, and peer-reviewed sources.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "weather": {
    workerUrl: "https://swarmspace-plugin-weather.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["weather", "real_time"],
    description: "Current weather and forecasts",
    exampleQuery: "What's the weather in San Francisco?",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Current weather and forecasts. Use for location-based weather queries only.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "wikipedia": {
    workerUrl: "https://swarmspace-plugin-wikipedia.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["knowledge", "encyclopedia", "general"],
    description: "Wikipedia knowledge base",
    exampleQuery: "Who invented the transistor?",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "General knowledge and encyclopedic lookups. Use for broad factual context and background.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "currency": {
    workerUrl: "https://swarmspace-plugin-currency.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["currency", "exchange_rates", "real_time"],
    description: "Currency exchange rates",
    exampleQuery: "What is EUR to USD right now?",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Currency exchange rates and conversions. Use for financial rate queries only.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "news": {
    workerUrl: "https://us-central1-arc-epi.cloudfunctions.net/newsDataInvoke",
    requiredTier: "free",
    capabilities: ["news", "real_time", "headlines"],
    description: "Latest news and headlines (NewsData.io)",
    exampleQuery: "Top tech news today",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Latest news and headlines. Use for real-time news briefings and trending topics.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  // ── New free tier plugins ──────────────────────────────────────────────────
  "arxiv": {
    workerUrl: "https://swarmspace-plugin-arxiv.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["academic_search", "preprints", "research"],
    description: "Scientific preprints from arXiv",
    exampleQuery: "Recent LLM alignment papers",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-01T00:00:00Z",
        agent_guidance: "Scientific preprints from arXiv. Use for cutting-edge research, physics, CS, and math papers.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "pubmed": {
    workerUrl: "https://swarmspace-plugin-pubmed.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["biomedical", "research", "clinical"],
    description: "Biomedical literature from PubMed/NCBI",
    exampleQuery: "Sleep and HRV studies",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Biomedical literature from PubMed/NCBI. Use for clinical, health, and life-science research.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "nominatim": {
    workerUrl: "https://swarmspace-plugin-nominatim.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["geocoding", "location", "maps"],
    description: "Geocoding via OpenStreetMap",
    exampleQuery: "Coords for La Jolla, CA",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Geocoding and location resolution via OpenStreetMap. Use for address/coordinate lookups.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "rest-countries": {
    workerUrl: "https://swarmspace-plugin-rest-countries.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["geography", "country_data", "reference"],
    description: "Country data and geography",
    exampleQuery: "Info about Japan",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Country data and geography. Use for demographic, cultural, and geographic reference.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "github-public": {
    workerUrl: "https://swarmspace-plugin-github-public.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["developer_tools", "repositories", "open_source"],
    description: "Public GitHub repo and developer data",
    exampleQuery: "Stars on bytedance/deer-flow",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Public GitHub repositories and developer data. Use for code discovery, stars, and repo metadata.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "hackernews": {
    workerUrl: "https://swarmspace-plugin-hackernews.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["tech_news", "community", "discussions"],
    description: "Tech community discussions from Hacker News",
    exampleQuery: "HN posts about MCP today",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Tech community discussions from Hacker News. Use for tech sentiment, startup buzz, and dev opinions.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "dictionary-api": {
    workerUrl: "https://swarmspace-plugin-dictionary-api.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["language", "definitions", "reference"],
    description: "Word definitions and etymology",
    exampleQuery: "Define interoperability",
    privacy_data_required: [],
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Word definitions and etymology. Use for language, spelling, and vocabulary queries.",
    latency_class: "fast",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "jina-reader": {
    workerUrl: "https://swarmspace-plugin-jina-reader.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["url_fetch", "content_extraction", "reading"],
    description: "Fetch and extract any URL content",
    exampleQuery: "Read https://example.com",
    privacy_data_required: ["user_urls", "web_content"],
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_urls", "web_content"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-04-10T00:00:00Z",
        agent_guidance: "Fetch and extract content from any URL. Use as fallback when a page blocks or is not in search indexes.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  // ── Standard tier ($30/mo) ─────────────────────────────────────────────────
  "vision-ocr": {
    workerUrl: "https://us-central1-arc-epi.cloudfunctions.net/visionOcrInvoke",
    requiredTier: "standard",
    capabilities: ["vision", "ocr", "image_understanding"],
    description: "Extract text (OCR) or understand images with Vision API + Gemini",
    exampleQuery: "Extract text from this screenshot / Describe this image",
    privacy_data_required: ["images", "documents", "personal_files"],
    privacyTier: PrivacyTier.STRUCTURED_PERSONAL,
    dataTypes: ["images", "documents", "personal_files"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Extract text (OCR) or understand images. Requires image data; use only when images are provided.",
    latency_class: "slow",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "url-reader": {
    workerUrl: "https://swarmspace-plugin-url-reader.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["url_fetch", "content_extraction", "reading"],
    description: "Fetch and extract content from URLs",
    exampleQuery: "Read and summarize this article: https://...",
    privacy_data_required: ["user_urls", "web_content"],
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_urls", "web_content"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-01T00:00:00Z",
        agent_guidance: "Fetch and extract content from URLs with higher fidelity than jina-reader. Use for detailed article extraction.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "media-upload": {
    workerUrl: "https://swarmspace-media-upload.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["media_host", "image_upload"],
    description: "Upload image and get a public URL (24h TTL)",
    exampleQuery: "Upload image for sharing",
    privacy_data_required: ["images"],
    privacyTier: PrivacyTier.STRUCTURED_PERSONAL,
    dataTypes: ["images", "media_uploads"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-15T00:00:00Z",
        agent_guidance: "Upload images and get public URLs. Use when user provides images that need hosting before processing.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "tavily-search": {
    workerUrl: "https://swarmspace-plugin-tavily-search.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["web_search", "ai_optimized", "research"],
    description: "AI-optimized search for research",
    exampleQuery: "Deep research on quantum computing applications",
    privacy_data_required: ["user_text", "queries"],
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_text", "queries"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-15T00:00:00Z",
        agent_guidance: "AI-optimized search for deep research. Use when standard web search is insufficient for technical topics.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "calendar-reader": {
    workerUrl: "https://swarmspace-plugin-calendar-reader.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["calendar", "scheduling", "meetings", "attendees"],
    description: "Read upcoming calendar events and attendee details from Google Calendar.",
    exampleQuery: "What meetings do I have today?",
    privacy_data_required: ["calendar_events", "attendee_names", "attendee_emails", "access_token"],
    privacyTier: PrivacyTier.STRUCTURED_PERSONAL,
    dataTypes: ["calendar_events", "attendee_data"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-05-01T00:00:00Z",
        agent_guidance: "Read upcoming calendar events and attendee details. Requires Google Calendar OAuth consent. Use for meeting prep and scheduling.",
    latency_class: "slow",
    trust_tier: "verified",
    rateLimits: { free: 0, standard: 500, premium: 500 },
    is_read_only: true,
    is_destructive: false,
    schedulable: true,
    headless: true,
  },
  // ── Premium tier ──────────────────────────────────────────────────────────
  "exa-search": {
    workerUrl: "https://swarmspace-plugin-exa-search.orbitalai.workers.dev",
    requiredTier: "premium",
    capabilities: ["neural_search", "semantic", "research"],
    description: "Neural semantic search",
    exampleQuery: "Find content similar to this concept",
    privacy_data_required: ["user_text", "queries"],
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_text", "queries"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-15T00:00:00Z",
        agent_guidance: "Neural semantic search. Use for finding conceptually similar content and research discovery.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  "perplexity-sonar": {
    workerUrl: "https://swarmspace-plugin-perplexity-sonar.orbitalai.workers.dev",
    requiredTier: "premium",
    capabilities: ["web_search", "answer_synthesis", "research"],
    description: "Real-time answer synthesis from the web",
    exampleQuery: "Explain the current state of fusion energy",
    privacy_data_required: ["user_text", "queries"],
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_text", "queries"],
    owner: "swarmspace",
    author: { name: "Orbital AI", type: "first-party" as const },
    pricing: { model: "included" as const, cost_per_call: null },
    version: "1.0.0",
    deployed_at: "2026-03-15T00:00:00Z",
        agent_guidance: "Real-time answer synthesis from the web with citations. Use for complex questions requiring summarized evidence.",
    latency_class: "standard",
    trust_tier: "verified",
    rateLimits: { free: 20, standard: 500, premium: 500 },
  },
  // social-publisher removed from plugin registry — social publishing requires
  // per-user OAuth state (LinkedIn/Bluesky tokens in KV) and explicit per-post
  // user approval, which doesn't fit the stateless plugin model. The worker
  // code remains in workers/cloudflare/social-publisher/ for future use as a
  // direct LUMARA integration with in-app approval UX.
};

// ── Developer plugin cache (TTL: 5 minutes) ─────────────────────────────────
let developerPluginCache: Record<string, PluginConfig> = {};
let developerPluginCacheTimestamp = 0;
const DEVELOPER_PLUGIN_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadDeveloperPlugins(): Promise<Record<string, PluginConfig>> {
  const now = Date.now();
  if (now - developerPluginCacheTimestamp < DEVELOPER_PLUGIN_TTL_MS) {
    return developerPluginCache;
  }

  try {
    const db = getFirestore();
    const snapshot = await db.collection("approved_plugins").get();
    const plugins: Record<string, PluginConfig> = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      plugins[doc.id] = {
        workerUrl: data.workerUrl,
        requiredTier: data.requiredTier || "free",
        capabilities: data.capabilities || [],
        description: data.description || "",
        exampleQuery: data.exampleQuery || "",
        privacy_data_required: data.privacy_data_required || [],
        privacyTier: data.privacyTier || PrivacyTier.ANONYMOUS,
        dataTypes: data.dataTypes || [],
        owner: data.owner || "developer",
        author: data.author || { name: "Developer", type: "developer" as const },
        pricing: data.pricing || { model: "included" as const, cost_per_call: null },
        version: data.version || "1.0.0",
        deployed_at: data.deployed_at || data.approved_at || new Date().toISOString(),
        agent_guidance: data.agent_guidance || "Developer plugin — review capability tags before use.",
        latency_class: data.latency_class || "standard",
        trust_tier: data.trust_tier || "community",
        rateLimits: data.rateLimits || { free: 20, standard: 500, premium: 500 },
        source: "developer",
      } as PluginConfig;
    }

    developerPluginCache = plugins;
    developerPluginCacheTimestamp = now;
    logger.info(`Loaded ${Object.keys(plugins).length} developer plugins from approved_plugins`);
    return plugins;
  } catch (err) {
    logger.error("Failed to load developer plugins", err);
    return developerPluginCache; // Return stale cache on error
  }
}

async function getMergedRegistry(): Promise<Record<string, PluginConfig>> {
  const devPlugins = await loadDeveloperPlugins();
  return { ...devPlugins, ...PLUGIN_REGISTRY }; // First-party takes priority on collision
}

// ── Chain Definitions ─────────────────────────────────────────────────────────
// Curated orchestrator workflows — extracted from workers/orchestrator/src/index.js
// Plugin IDs use router names (not orchestrator-internal names):
//   newsapi -> news, exchange-rates -> currency, open-meteo -> weather

interface ChainDefinition {
  route: string;
  name: string;
  plugins: string[];
  description: string;
  endpoint: string;
}

const CHAIN_DEFINITIONS: ChainDefinition[] = [
  { route: "/research", name: "Deep Research",
    plugins: ["brave-search", "wikipedia", "semantic-scholar", "gemini-flash"],
    description: "Web search + Wikipedia + academic papers, synthesized by Gemini",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/research" },
  { route: "/competitor", name: "Competitive Analysis",
    plugins: ["brave-search", "news", "hackernews", "gemini-flash"],
    description: "Competitive intelligence from web, news, and tech community",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/competitor" },
  { route: "/marketing", name: "Marketing Brief",
    plugins: ["brave-search", "news", "gemini-flash"],
    description: "Content marketing brief with trending themes and calendar suggestions",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/marketing" },
  { route: "/plugins", name: "Plugin Discovery",
    plugins: ["brave-search", "github-public", "gemini-flash"],
    description: "API and plugin ecosystem analysis with integration patterns",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/plugins" },
  { route: "/academic", name: "Academic Research",
    plugins: ["semantic-scholar", "arxiv", "pubmed", "gemini-flash"],
    description: "Deep academic literature review across multiple databases",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/academic" },
  { route: "/news-brief", name: "News Brief",
    plugins: ["news", "hackernews", "brave-search", "gemini-flash"],
    description: "Multi-source news intelligence briefing",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/news-brief" },
  { route: "/market-scan", name: "Market Scan",
    plugins: ["brave-search", "news", "currency", "gemini-flash"],
    description: "Financial and market overview with exchange rate context",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/market-scan" },
  { route: "/location-brief", name: "Location Brief",
    plugins: ["nominatim", "weather", "rest-countries", "wikipedia", "gemini-flash"],
    description: "Geographic intelligence with weather, country data, and context",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/location-brief" },
  { route: "/health-research", name: "Health Research",
    plugins: ["pubmed", "semantic-scholar", "wikipedia", "gemini-flash"],
    description: "Biomedical research summary with clinical evidence assessment",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/health-research" },
  { route: "/tech-scout", name: "Tech Scout",
    plugins: ["github-public", "hackernews", "brave-search", "arxiv", "gemini-flash"],
    description: "Technology evaluation with community adoption and maturity assessment",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/tech-scout" },
  { route: "/fact-check", name: "Fact Check",
    plugins: ["brave-search", "wikipedia", "semantic-scholar", "dictionary-api", "gemini-flash"],
    description: "Multi-source fact verification with confidence rating",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/fact-check" },
  { route: "/content-brief", name: "Content Brief",
    plugins: ["brave-search", "wikipedia", "news", "gemini-flash"],
    description: "Content creation brief with research, outline, and data points",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/content-brief" },
  { route: "/decision-simulation", name: "Decision Simulation",
    plugins: ["gemini-flash"],
    description: "Monte Carlo decision simulation using personal behavioral context as seed material",
    endpoint: "https://swarmspace-orchestrator.orbitalai.workers.dev/decision-simulation" },
];

// ── Tier resolution ────────────────────────────────────────────────────────────
// Maps your existing plan names to SwarmSpace tier names.
// Your Firestore users have plan: "free" | "pro"
// SwarmSpace workers understand: "free" | "standard" | "premium"
function resolveSwarmSpaceTier(plan: string, isPremium: boolean): Tier {
  if (!isPremium) return "free";
  // Right now "pro" maps to "standard". When you add a higher tier, map it to "premium".
  return "standard";
}

// ── Tier access check ──────────────────────────────────────────────────────────
// Returns true if the user's tier meets the plugin's requirement.
const TIER_RANK: Record<Tier, number> = { free: 0, standard: 1, premium: 2 };

function canAccessPlugin(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/** Effective SwarmSpace tier for plugin access. Admin emails (e.g. marcyap@orbitalai.net) get at least standard. */
function effectiveUserTier(
  request: { auth?: { token?: { email?: string } } },
  user: { plan?: string },
  isPremium: boolean
): Tier {
  const resolved = resolveSwarmSpaceTier(user.plan ?? "free", isPremium);
  const email = request.auth?.token?.email as string | undefined;
  if (isAdminEmail(email) && TIER_RANK[resolved] < TIER_RANK.standard) {
    return "standard";
  }
  return resolved;
}

// ── Credit enforcement ─────────────────────────────────────────────────────────
const SWARMSPACE_USAGE_COLLECTION = "swarmspace_usage";

const TIER_DAILY_LIMITS: Record<Tier, number> = {
  free: 20,
  standard: 500,
  premium: 500,
};

interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
}

async function enforceSwarmSpaceQuota(
  userId: string,
  userTier: Tier,
  isAdmin: boolean,
  isMcpSession = false
): Promise<QuotaInfo> {
  if (isAdmin || isMcpSession) {
    return { limit: -1, used: 0, remaining: -1, resets_at: "" };
  }

  const db = getFirestore();
  const limit = TIER_DAILY_LIMITS[userTier] ?? TIER_DAILY_LIMITS.free;
  const usageRef = db.collection(SWARMSPACE_USAGE_COLLECTION).doc(`${userId}_daily`);

  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

  const usageDoc = await usageRef.get();
  let currentCount = 0;
  let needsReset = false;

  if (usageDoc.exists) {
    const data = usageDoc.data()!;
    const windowStart = data.windowStart;
    if (windowStart && typeof windowStart.toMillis === "function") {
      if (windowStart.toMillis() < todayMidnight.getTime()) {
        needsReset = true;
      } else {
        currentCount = data.count || 0;
      }
    } else {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  if (currentCount >= limit) {
    logger.warn(`SwarmSpace quota exceeded: user=${userId} tier=${userTier} used=${currentCount}/${limit}`);
    throw new HttpsError(
      "resource-exhausted",
      `Daily call limit reached (${currentCount}/${limit}). Resets at midnight UTC.`,
      {
        quota: { limit, used: currentCount, remaining: 0, resets_at: tomorrowMidnight.toISOString() },
        upgrade_url: "https://swarmspace.ai/upgrade",
      }
    );
  }

  if (needsReset) {
    await usageRef.set({ userId, count: 1, windowStart: todayMidnight, updatedAt: FieldValue.serverTimestamp() });
    currentCount = 1;
  } else {
    await usageRef.update({ count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    currentCount += 1;
  }

  const remaining = Math.max(0, limit - currentCount);
  if (remaining > 0 && currentCount >= limit * 0.8) {
    logger.info(`SwarmSpace quota 80% warning: user=${userId} tier=${userTier} used=${currentCount}/${limit}`);
  }

  return { limit, used: currentCount, remaining, resets_at: tomorrowMidnight.toISOString() };
}

// ── Activity log (PRISM Phase 1) ───────────────────────────────────────────────
// Fire-and-forget write to Firestore so every plugin call is recorded for Activity tab.
function writePluginActivityLog(entry: {
  user_id: string;
  plugin_id: string;
  plugin_name: string;
  user_tier: string;
  privacy_required: boolean;
  consent_given: boolean;
  data_fields_sent: string[];
  result: "success" | "error" | "blocked";
  error_message?: string;
}): void {
  const db = getFirestore();
  db.collection(PLUGIN_ACTIVITY_COLLECTION)
    .add({
      ...entry,
      called_at: new Date(),
    })
    .catch((err) => logger.warn("plugin_activity_log write failed", err));
}

// ── The router function ────────────────────────────────────────────────────────
/** Plugin IDs that accept per-user API key override (LLM plugins) */
const LLM_PLUGINS = new Set(["gemini-flash"]);

export const swarmspaceRouter = onCall(
  {
    secrets: [SWARMSPACE_INTERNAL_TOKEN, LLM_SETTINGS_ENCRYPTION_KEY, GITHUB_TOKEN, JINA_API_KEY, NCBI_API_KEY],
  },
  async (request) => {
    // Step 1: Authentication.
    //
    // Two paths:
    //   (a) Normal: Firebase ID token → enforceAuth (existing behavior, used by LUMARA app)
    //   (b) Service-token bypass: request.data._service_token matches SWARMSPACE_INTERNAL_TOKEN
    //       AND request.data._run_as_uid is provided → skip enforceAuth, run as that uid.
    //       Used by Durable Object alarms (recurring agents) where a user-bound Firebase
    //       ID token isn't available at fire time. Internal infrastructure only — the
    //       service token never leaves SwarmSpace.
    let userId: string;
    let isPremium: boolean;
    let user: Awaited<ReturnType<typeof enforceAuth>>["user"];

    const reqServiceToken = request.data?._service_token;
    const reqRunAsUid = request.data?._run_as_uid;
    if (reqServiceToken !== undefined || reqRunAsUid !== undefined) {
      if (reqServiceToken !== SWARMSPACE_INTERNAL_TOKEN.value()) {
        throw new HttpsError("permission-denied", "invalid service token");
      }
      if (typeof reqRunAsUid !== "string" || !reqRunAsUid) {
        throw new HttpsError("invalid-argument", "_run_as_uid is required when _service_token is set");
      }
      const db = getFirestore();
      const userSnap = await db.collection("users").doc(reqRunAsUid).get();
      if (!userSnap.exists) {
        // Auto-provision a free-tier record for OAuth/MCP users who authenticated
        // via the MCP server but haven't gone through the SwarmSpace web registration.
        const now = new Date().toISOString();
        const provisioned = { userId: reqRunAsUid, plan: "free", isPremium: false, createdAt: now, updatedAt: now, source: "mcp-oauth" };
        await db.collection("users").doc(reqRunAsUid).set(provisioned);
        user = provisioned as unknown as typeof user;
      } else {
        user = userSnap.data() as typeof user;
      }
      userId = reqRunAsUid;
      isPremium = (user as { isPremium?: boolean; plan?: string }).isPremium === true
        || (user as { plan?: string }).plan === "pro"
        || (user as { plan?: string }).plan === "premium";
      logger.info(`SwarmSpace router: SERVICE-TOKEN call for uid=${userId} viaMcp=${request.data?._via_mcp === true}`);
    } else {
      const auth = await enforceAuth(request);
      userId = auth.userId;
      isPremium = auth.isPremium;
      user = auth.user;
    }

    const isMcpSession = request.data?._via_mcp === true;

    // Step 2: Parse the request — LUMARA sends { plugin_id, params }
    const { plugin_id, params } = request.data ?? {};

    if (!plugin_id || typeof plugin_id !== "string") {
      throw new HttpsError("invalid-argument", "plugin_id is required");
    }

    // Step 3: Look up the plugin in the merged registry (first-party + developer).
    // If it's not registered, we reject it — no unknown plugins allowed.
    const registry = await getMergedRegistry();
    const plugin = registry[plugin_id];
    if (!plugin) {
      throw new HttpsError("not-found", `Unknown plugin: ${plugin_id}`);
    }

    // Step 4: Check if the user's plan allows this plugin.
    const userTier = effectiveUserTier(request, user, isPremium);
    if (!canAccessPlugin(userTier, plugin.requiredTier)) {
      throw new HttpsError(
        "permission-denied",
        `Plugin "${plugin_id}" requires the ${plugin.requiredTier} plan. ` +
          `You are on the ${userTier} plan.`,
        {
          plugin_id,
          required_tier: plugin.requiredTier,
          user_tier: userTier,
          upgrade_url: "https://swarmspace.ai/upgrade",
        }
      );
    }

    logger.info(
      `SwarmSpace router: user=${userId} tier=${userTier} plugin=${plugin_id}`
    );

    // Step 4a: Enforce daily call quota (atomic check-increment-or-block)
    const requestEmail = request.auth?.token?.email as string | undefined;
    const isAdminUser = isAdminEmail(requestEmail);
    const quota = await enforceSwarmSpaceQuota(userId, userTier, isAdminUser, isMcpSession);

    // Step 4b: For LLM plugins, pass user's API key if they have custom config
    let paramsToSend = params ?? {};
    if (LLM_PLUGINS.has(plugin_id)) {
      const encKey = LLM_SETTINGS_ENCRYPTION_KEY.value();
      if (encKey) {
        const userLlm = await loadUserLlmSettings(userId, encKey);
        if (userLlm && (userLlm.provider === "gemini" || userLlm.provider === "swarmspace")) {
          paramsToSend = { ...paramsToSend, _apiKeyOverride: userLlm.apiKey };
        }
      }
    }

    // Step 4c: PRISM middleware — intercept before worker
    // PRISM enforcement: consent gating + context field filtering
    const declaredFields = plugin.privacy_data_required ?? [];
    const pluginPrivacyTier = plugin.privacyTier ?? PrivacyTier.ANONYMOUS;
    const consentGiven = paramsToSend._prism_consent === true || paramsToSend._prism_consent === "true";
    const consentRequired = requiresUserConsent(pluginPrivacyTier);

    // System keys that are always allowed through to the worker
    const SYSTEM_KEYS = new Set(["query", "limit", "count", "mode", "_apiKeyOverride",
      "base", "word", "q", "topic", "format", "currency", "lang"]);

    // Build allowlist: declared privacy fields + system keys
    const allowedKeys = new Set([...declaredFields, ...SYSTEM_KEYS]);

    // Context field filtering: strip undeclared fields before forwarding
    const paramsForWorker: Record<string, unknown> = {};
    const strippedFields: string[] = [];
    for (const [key, value] of Object.entries(paramsToSend)) {
      if (key === "_prism_consent") continue; // Always strip consent flag
      if (allowedKeys.has(key)) {
        paramsForWorker[key] = value;
      } else {
        strippedFields.push(key);
      }
    }

    const dataFieldsSent = Object.keys(paramsForWorker).filter((k) =>
      ["image_b64", "image_url", "url", "image_base64"].includes(k)
    );

    // Consent gating based on PrivacyTier
    if (consentRequired && !consentGiven) {
      // For STRUCTURED_PERSONAL: always require fresh consent
      // For USER_CONTENT: require consent (persistent approval is a future enhancement)
      logger.info("prism_transaction", {
        phase: "pre_invoke",
        plugin_id,
        user_id: userId,
        user_tier: userTier,
        privacy_tier: pluginPrivacyTier,
        privacy_data_required: declaredFields,
        consent_given: false,
        ts: new Date().toISOString(),
      });
      logger.warn(`PRISM: Blocking unconsented privacy-requiring plugin call`, {
        plugin_id,
        userId,
        privacyTier: pluginPrivacyTier,
        consentGiven: false,
      });
      writePluginActivityLog({
        user_id: userId,
        plugin_id,
        plugin_name: plugin.description,
        user_tier: userTier,
        privacy_required: declaredFields.length > 0,
        consent_given: false,
        data_fields_sent: dataFieldsSent,
        result: "blocked",
        error_message: "PRISM consent not provided",
      });
      throw new HttpsError(
        "permission-denied",
        "This plugin requires access to sensitive data. Please provide consent before proceeding.",
        {
          code: "PRISM_CONSENT_REQUIRED",
          plugin_id,
          privacy_data_required: declaredFields,
          privacy_tier: pluginPrivacyTier,
        }
      );
    }

    // Log the PRISM transaction (always, for audit trail)
    logger.info("prism_transaction", {
      phase: "pre_invoke",
      plugin_id,
      user_id: userId,
      user_tier: userTier,
      privacy_tier: pluginPrivacyTier,
      privacy_data_required: declaredFields,
      consent_given: consentRequired ? consentGiven : "not_required",
      fields_kept: Object.keys(paramsForWorker),
      ...(strippedFields.length > 0 ? { fields_stripped: strippedFields } : {}),
      ts: new Date().toISOString(),
    });

    // Step 5: Forward the request to the worker.
    // Cloudflare workers expect POST to <base>/invoke; our own HTTP functions (vision-ocr, news)
    // are deployed at the base URL only, so we must not append /invoke for them.
    const internalToken = SWARMSPACE_INTERNAL_TOKEN.value();
    const isOurCloudFunction = plugin.workerUrl.includes("cloudfunctions.net");
    const workerUrl = isOurCloudFunction ? plugin.workerUrl : `${plugin.workerUrl}/invoke`;

    // Credential injection — workers never hold API keys in their own env.
    // The router is the single secret-holder; it injects per-plugin credentials
    // into the request body at call time. Empty string = secret not set; skip it.
    const pluginCredentials: Record<string, string> = {};
    if (plugin_id === "github-public") {
      const t = GITHUB_TOKEN.value(); if (t) pluginCredentials.github_token = t;
    } else if (plugin_id === "jina-reader") {
      const k = JINA_API_KEY.value(); if (k) pluginCredentials.jina_api_key = k;
    } else if (plugin_id === "pubmed") {
      const k = NCBI_API_KEY.value(); if (k) pluginCredentials.ncbi_api_key = k;
    }
    const bodyPayload = Object.keys(pluginCredentials).length > 0
      ? { ...paramsForWorker, ...pluginCredentials }
      : paramsForWorker;

    let workerResponse: Response;
    try {
      workerResponse = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalToken}`,
          "X-SwarmSpace-User-Id": userId,
          "X-SwarmSpace-User-Tier": userTier,
        },
        body: JSON.stringify(bodyPayload),
        // 25 second timeout — Firebase functions time out at 60s,
        // this leaves headroom for our own error handling
        signal: AbortSignal.timeout(25_000),
      });
    } catch (err: any) {
      logger.error(`Worker fetch failed for plugin ${plugin_id}:`, err);
      writePluginActivityLog({
        user_id: userId,
        plugin_id,
        plugin_name: plugin.description,
        user_tier: userTier,
        privacy_required: declaredFields.length > 0,
        consent_given: consentGiven,
        data_fields_sent: dataFieldsSent,
        result: "error",
        error_message: err?.message ?? "Worker fetch failed",
      });
      throw new HttpsError(
        "unavailable",
        `Plugin ${plugin_id} is temporarily unavailable. Try again shortly.`
      );
    }

    // Step 6: Parse and return the worker's response.
    // We pass it through as-is — quota info, results, everything.
    let workerBody: unknown;
    try {
      workerBody = await workerResponse.json();
    } catch {
      throw new HttpsError("internal", `Plugin ${plugin_id} returned invalid response`);
    }

    // If the worker returned an error (e.g. quota exceeded), surface it cleanly.
    if (!workerResponse.ok) {
      const body = workerBody as Record<string, unknown>;
      const workerError = (body?.error as string) ?? "Plugin error";
      logger.warn(
        `Plugin ${plugin_id} returned ${workerResponse.status}: ${workerError}`
      );
      writePluginActivityLog({
        user_id: userId,
        plugin_id,
        plugin_name: plugin.description,
        user_tier: userTier,
        privacy_required: declaredFields.length > 0,
        consent_given: consentGiven,
        data_fields_sent: dataFieldsSent,
        result: "error",
        error_message: workerError,
      });
      // 429 = quota exceeded — this is expected, not a crash
      if (workerResponse.status === 429) {
        throw new HttpsError("resource-exhausted", workerError, {
          plugin_id,
          quota: body?.quota,
        });
      }
      // 403 = tier insufficient (shouldn't happen since we check above, but belt+suspenders)
      if (workerResponse.status === 403) {
        throw new HttpsError("permission-denied", workerError);
      }
      throw new HttpsError("internal", workerError);
    }

    logger.info(`SwarmSpace plugin ${plugin_id} success for user ${userId}`);
    writePluginActivityLog({
      user_id: userId,
      plugin_id,
      plugin_name: plugin.description,
      user_tier: userTier,
      privacy_required: declaredFields.length > 0,
      consent_given: consentGiven,
      data_fields_sent: dataFieldsSent,
      result: "success",
    });

    // Return the worker's response body to LUMARA with quota info
    const responseWithQuota = {
      ...(typeof workerBody === "object" && workerBody !== null ? workerBody : { data: workerBody }),
      quota,
    };
    return responseWithQuota;
  }
);

// ── Plugin status endpoint ─────────────────────────────────────────────────────
// LUMARA calls this to check if a plugin is available for the current user.
// Lightweight — no quota consumed, no worker called.
export const swarmspacePluginStatus = onCall(
  {},
  async (request) => {
    const { isPremium, user } = await enforceAuth(request);
    const { plugin_id } = request.data ?? {};

    if (!plugin_id || typeof plugin_id !== "string") {
      throw new HttpsError("invalid-argument", "plugin_id is required");
    }

    const registry = await getMergedRegistry();
    const plugin = registry[plugin_id];
    if (!plugin) {
      return { available: false, reason: "unknown_plugin" };
    }

    const userTier = effectiveUserTier(request, user, isPremium);
    const available = canAccessPlugin(userTier, plugin.requiredTier);

    return {
      available,
      plugin_id,
      user_tier: userTier,
      required_tier: plugin.requiredTier,
      reason: available ? null : "tier_insufficient",
      upgrade_url: available ? null : "https://swarmspace.ai/upgrade",
    };
  }
);

// ── Plugin catalog endpoint ────────────────────────────────────────────────────
// Returns full catalog with metadata + availability for the current user.
// Used by the SwarmSpace catalog UI and by the orchestrator for capability routing.
//
// §4.4 /catalogue/updates — optional delta-sync params:
//   - since (ISO 8601 string): when provided, returns only plugins with
//     deployed_at > since, sorted descending. Triggers per-UID rate limit
//     (1 successful call per 6 hours, mirrors discovery_rate_limits pattern).
//   - interest_tags (string[], max 20): when provided, capability-tag matching is
//     done over SHA-256 hashes (lowercased input, first 16 hex chars). LUMARA
//     never sends raw tag strings on the wire; the server hashes plugin
//     capabilities the same way and intersects. Note: server still computes the
//     hashes server-side, so the privacy benefit is wire-level only — this is
//     the design intent per backlog §4.4.
//
// Backwards-compatible: when neither param is provided, behavior is unchanged
// (full catalog, no rate limit).
const CATALOGUE_UPDATES_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours
const CATALOGUE_UPDATES_MAX = 1; // 1 successful call per window

/**
 * Hashes a tag string for capability/interest matching. Mirrors the hashIp
 * pattern in swarmspaceDiscoveryAgent.ts:113-115. Lowercases input first so
 * casing differences between LUMARA-supplied tags and registry capabilities
 * do not cause false misses.
 */
function hashTag(tag: string): string {
  return createHash("sha256").update(tag.toLowerCase()).digest("hex").slice(0, 16);
}

export const swarmspacePluginCatalog = onCall(
  {},
  async (request) => {
    const { isPremium, user, userId } = await enforceAuth(request);
    const userTier = effectiveUserTier(request, user, isPremium);

    // ── Parse optional §4.4 delta-sync params ───────────────────────────────
    const data = (request.data || {}) as { since?: unknown; interest_tags?: unknown };
    const sinceRaw = data.since;
    const interestTagsRaw = data.interest_tags;

    let sinceIso: string | null = null;
    if (sinceRaw !== undefined && sinceRaw !== null) {
      if (typeof sinceRaw !== "string") {
        throw new HttpsError("invalid-argument", "invalid since timestamp");
      }
      const parsed = new Date(sinceRaw);
      if (isNaN(parsed.getTime())) {
        throw new HttpsError("invalid-argument", "invalid since timestamp");
      }
      sinceIso = sinceRaw;
    }

    let interestTags: string[] | null = null;
    if (interestTagsRaw !== undefined && interestTagsRaw !== null) {
      if (
        !Array.isArray(interestTagsRaw) ||
        interestTagsRaw.length > 20 ||
        !interestTagsRaw.every((t) => typeof t === "string")
      ) {
        throw new HttpsError("invalid-argument", "invalid interest_tags");
      }
      interestTags = interestTagsRaw as string[];
    }

    const isFiltered = sinceIso !== null || interestTags !== null;

    // ── Per-UID rate limit (only when `since` is provided) ──────────────────
    // Mirrors the discovery_rate_limits pattern: { count, windowStart }, reset
    // when (now - windowStart) exceeds the window.
    if (sinceIso !== null) {
      const db = getFirestore();
      const ref = db.collection("catalogue_update_rate_limits").doc(userId);
      const doc = await ref.get();
      const now = Date.now();

      if (!doc.exists) {
        await ref.set({ count: 1, windowStart: now });
      } else {
        const rl = doc.data()!;
        const elapsed = now - (rl.windowStart || 0);
        if (elapsed > CATALOGUE_UPDATES_WINDOW_MS) {
          // Reset window
          await ref.set({ count: 1, windowStart: now });
        } else if ((rl.count || 0) >= CATALOGUE_UPDATES_MAX) {
          throw new HttpsError(
            "resource-exhausted",
            "catalogue updates limited to 1 per 6 hours"
          );
        } else {
          await ref.update({ count: FieldValue.increment(1) });
        }
      }
    }

    const registry = await getMergedRegistry();
    let entries = Object.entries(registry);

    // ── since filter: deployed_at > since (ISO lexicographic compare) ───────
    if (sinceIso !== null) {
      const sinceCmp = sinceIso;
      entries = entries.filter(([, config]) => (config.deployed_at || "") > sinceCmp);
      // Sort descending by deployed_at
      entries.sort(([, a], [, b]) => (b.deployed_at || "").localeCompare(a.deployed_at || ""));
    }

    // ── interest_tags filter: hashed capability ∩ hashed interest tags ──────
    // Privacy note: hashing happens both client-side (LUMARA) and server-side
    // (here, over plugin capabilities), so the hash is trivially reversible
    // server-side. The benefit is wire-level: raw tag strings never travel
    // across the network from LUMARA → SwarmSpace. Design intent per §4.4.
    if (interestTags !== null) {
      const interestHashes = new Set(interestTags.map(hashTag));
      entries = entries.filter(([, config]) => {
        const capHashes = (config.capabilities || []).map(hashTag);
        return capHashes.some((h) => interestHashes.has(h));
      });
    }

    const plugins = entries.map(([pluginId, config]) => ({
      plugin_id: pluginId,
      description: config.description,
      required_tier: config.requiredTier,
      available: canAccessPlugin(userTier, config.requiredTier),
      owner: config.owner,
      author: config.author,
      capabilities: config.capabilities,
      pricing: config.pricing,
      privacy_data_required: config.privacy_data_required ?? [],
      version: config.version,
      deployed_at: config.deployed_at,
      rate_limits: config.rateLimits,
      worker_url: config.workerUrl,
      example_query: config.exampleQuery,
      cost_tier: config.costTier ?? config.requiredTier,
      source: config.source ?? "first-party",
    }));

    const baseResponse = {
      user_tier: userTier,
      catalog_version: CATALOG_VERSION,
      plugins,
      chains: CHAIN_DEFINITIONS,
      upgrade_url: "https://swarmspace.ai/upgrade",
    };

    if (isFiltered) {
      return {
        ...baseResponse,
        filtered: true,
        since: sinceIso,
        count: plugins.length,
      };
    }

    return baseResponse;
  }
);

// ── Capabilities doc writer (admin-only) ──────────────────────────────────────
// Writes swarmspace_capabilities/current to Firestore so LUMARA can listen
// for real-time updates when plugins or chains change.

export const swarmspaceWriteCapabilities = onCall(
  {},
  async (request) => {
    const { userId } = await enforceAuth(request);
    const email = request.auth?.token?.email as string | undefined;
    if (!isAdminEmail(email)) {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const registry = await getMergedRegistry();
    const allCapabilities = new Set<string>();
    Object.values(registry).forEach(p => p.capabilities.forEach(c => allCapabilities.add(c)));

    const pluginIds = Object.keys(registry);

    const doc = {
      catalog_version: CATALOG_VERSION,
      plugin_count: pluginIds.length,
      plugin_ids: pluginIds,
      chain_count: CHAIN_DEFINITIONS.length,
      chain_routes: CHAIN_DEFINITIONS.map(c => c.route),
      capabilities: Array.from(allCapabilities).sort(),
      updated_at: FieldValue.serverTimestamp(),
      updated_by: userId,
    };

    const db = getFirestore();
    await db.collection("swarmspace_capabilities").doc("current").set(doc);

    logger.info("swarmspace_capabilities/current written", { plugin_count: doc.plugin_count });
    return { success: true, ...doc };
  }
);