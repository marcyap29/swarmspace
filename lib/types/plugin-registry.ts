// Enhanced Plugin Registry with Privacy Classifications
// Combines existing SwarmSpace plugins with LUMARA's privacy tier system

import { PrivacyTier } from './privacy-tiers';

export type Tier = "free" | "standard" | "premium";

/**
 * Enhanced plugin configuration with privacy and metadata
 */
export interface PluginConfig {
  // Core plugin info
  id: string;
  workerUrl: string;
  requiredTier: Tier;

  // Capabilities and metadata
  capabilities: string[];
  description: string;
  exampleQuery: string;

  // Privacy and compliance
  privacyTier: PrivacyTier;
  dataTypes: string[];

  // Optional configurations
  costTier?: Tier;
  timeout?: number;
  rateLimit?: {
    requests: number;
    window: string; // e.g., "1m", "1h", "1d"
  };
}

/**
 * Complete plugin registry with privacy classifications
 * Enhanced from existing SwarmSpace plugin list
 */
export const ENHANCED_PLUGIN_REGISTRY: Record<string, PluginConfig> = {
  // ── Free tier plugins with privacy classifications ──────────────────────
  "gemini-flash": {
    id: "gemini-flash",
    workerUrl: "https://swarmspace-plugin-gemini-flash.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["llm", "synthesis", "writing"],
    description: "Fast AI synthesis for writing and drafting",
    exampleQuery: "Draft a LinkedIn post about my latest project",
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_text", "queries"]
  },

  "brave-search": {
    id: "brave-search",
    workerUrl: "https://swarmspace-plugin-brave-search.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["web_search", "general"],
    description: "Privacy-focused web search",
    exampleQuery: "What are the latest developments in AI?",
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data", "search_results"]
  },

  "semantic-scholar": {
    id: "semantic-scholar",
    workerUrl: "https://swarmspace-plugin-semantic-scholar.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["academic_search", "research", "papers"],
    description: "Academic paper and citation search",
    exampleQuery: "Find papers on transformer architectures",
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data", "academic_papers"]
  },

  "arxiv": {
    id: "arxiv",
    workerUrl: "https://swarmspace-plugin-arxiv.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["academic_search", "preprints", "research"],
    description: "Scientific preprints from arXiv",
    exampleQuery: "Recent LLM alignment papers",
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data", "academic_papers"]
  },

  "github-public": {
    id: "github-public",
    workerUrl: "https://swarmspace-plugin-github-public.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["developer_tools", "repositories", "open_source"],
    description: "Public GitHub repo and developer data",
    exampleQuery: "Stars on bytedance/deer-flow",
    privacyTier: PrivacyTier.ANONYMOUS,
    dataTypes: ["public_data", "repository_data"]
  },

  "jina-reader": {
    id: "jina-reader",
    workerUrl: "https://swarmspace-plugin-jina-reader.orbitalai.workers.dev",
    requiredTier: "free",
    capabilities: ["url_fetch", "content_extraction", "reading"],
    description: "Fetch and extract any URL content",
    exampleQuery: "Read https://example.com",
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_urls", "web_content"]
  },

  // ── Standard tier plugins ─────────────────────────────────────────────
  "vision-ocr": {
    id: "vision-ocr",
    workerUrl: "https://us-central1-arc-epi.cloudfunctions.net/visionOcrInvoke",
    requiredTier: "standard",
    capabilities: ["vision", "ocr", "image_understanding"],
    description: "Extract text (OCR) or understand images with Vision API + Gemini",
    exampleQuery: "Extract text from this screenshot / Describe this image",
    privacyTier: PrivacyTier.STRUCTURED_PERSONAL,
    dataTypes: ["images", "documents", "personal_files"]
  },

  "url-reader": {
    id: "url-reader",
    workerUrl: "https://swarmspace-plugin-url-reader.orbitalai.workers.dev",
    requiredTier: "standard",
    capabilities: ["url_fetch", "content_extraction", "reading"],
    description: "Fetch and extract content from URLs",
    exampleQuery: "Read and summarize this article: https://...",
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_urls", "web_content"]
  },

  // ── Premium tier plugins ──────────────────────────────────────────────
  "exa-search": {
    id: "exa-search",
    workerUrl: "https://swarmspace-plugin-exa-search.orbitalai.workers.dev",
    requiredTier: "premium",
    capabilities: ["neural_search", "semantic", "research"],
    description: "Neural semantic search",
    exampleQuery: "Find content similar to this concept",
    privacyTier: PrivacyTier.USER_CONTENT,
    dataTypes: ["user_queries", "semantic_data"]
  }
};

/**
 * Get plugins available for a specific tier
 */
export function getPluginsForTier(userTier: Tier): Record<string, PluginConfig> {
  const tierRank: Record<Tier, number> = { free: 0, standard: 1, premium: 2 };
  const userRank = tierRank[userTier];

  return Object.fromEntries(
    Object.entries(ENHANCED_PLUGIN_REGISTRY)
      .filter(([_, config]) => tierRank[config.requiredTier] <= userRank)
  );
}

/**
 * Get plugins by privacy tier
 */
export function getPluginsByPrivacyTier(privacyTier: PrivacyTier): PluginConfig[] {
  return Object.values(ENHANCED_PLUGIN_REGISTRY)
    .filter(plugin => plugin.privacyTier === privacyTier);
}

/**
 * Check if user tier can access plugin
 */
export function canAccessPlugin(userTier: Tier, pluginId: string): boolean {
  const plugin = ENHANCED_PLUGIN_REGISTRY[pluginId];
  if (!plugin) return false;

  const tierRank: Record<Tier, number> = { free: 0, standard: 1, premium: 2 };
  return tierRank[userTier] >= tierRank[plugin.requiredTier];
}