// Tier tool definitions for plan generation
// Maps user tier to the list of tools the planning LLM can reference

export type Tier = "free" | "standard" | "premium";

export interface ToolInfo {
  id: string;
  description: string;
}

const FREE_TOOLS: ToolInfo[] = [
  { id: "gemini-flash", description: "Fast AI synthesis for writing and drafting" },
  { id: "brave-search", description: "Privacy-focused web search" },
  { id: "semantic-scholar", description: "Academic paper and citation search" },
  { id: "weather", description: "Current weather and forecasts" },
  { id: "wikipedia", description: "Wikipedia knowledge base" },
  { id: "currency", description: "Currency exchange rates" },
  { id: "news", description: "Latest news and headlines" },
  { id: "arxiv", description: "Scientific preprints from arXiv" },
  { id: "pubmed", description: "Biomedical literature from PubMed/NCBI" },
  { id: "nominatim", description: "Geocoding via OpenStreetMap" },
  { id: "rest-countries", description: "Country data and geography" },
  { id: "github-public", description: "Public GitHub repo and developer data" },
  { id: "hackernews", description: "Tech community discussions from Hacker News" },
  { id: "dictionary-api", description: "Word definitions and etymology" },
  { id: "jina-reader", description: "Fetch and extract any URL content" },
];

const STANDARD_TOOLS: ToolInfo[] = [
  { id: "url-reader", description: "Fetch and extract content from URLs" },
  { id: "tavily-search", description: "AI-optimized search for research" },
  { id: "vision-ocr", description: "Extract text or understand images" },
  { id: "media-upload", description: "Upload image and get a public URL" },
  { id: "social-publisher", description: "Publish to LinkedIn, Bluesky, and more" },
];

const PREMIUM_TOOLS: ToolInfo[] = [
  { id: "exa-search", description: "Neural semantic search" },
  { id: "perplexity-sonar", description: "Real-time answer synthesis from the web" },
];

export function getToolsForTier(tier: Tier): ToolInfo[] {
  switch (tier) {
    case "premium":
      return [...FREE_TOOLS, ...STANDARD_TOOLS, ...PREMIUM_TOOLS];
    case "standard":
      return [...FREE_TOOLS, ...STANDARD_TOOLS];
    case "free":
    default:
      return [...FREE_TOOLS];
  }
}

export function formatToolListForPrompt(tools: ToolInfo[]): string {
  return tools.map((t) => `- ${t.id}: ${t.description}`).join("\n");
}

export function getToolIds(tier: Tier): Set<string> {
  return new Set(getToolsForTier(tier).map((t) => t.id));
}

/**
 * Check if a plan requires tools above the user's tier.
 * Returns true if any tool in the plan is not available for the tier.
 */
export function planRequiresPremium(
  toolsRequired: string[],
  tier: Tier
): boolean {
  const available = getToolIds(tier);
  return toolsRequired.some((t) => !available.has(t));
}
