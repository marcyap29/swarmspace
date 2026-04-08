// Plugin Registry API Worker
// Serves plugin metadata with privacy tiers for client applications

// Note: For now, we'll include the types directly until we set up proper module resolution
// TODO: Set up TypeScript build process for shared types

type Tier = "free" | "standard" | "premium";

enum PrivacyTier {
  ANONYMOUS = 'anonymous',
  USER_CONTENT = 'user_content',
  STRUCTURED_PERSONAL = 'structured_personal'
}

interface PluginConfig {
  id: string;
  workerUrl: string;
  requiredTier: Tier;
  capabilities: string[];
  description: string;
  exampleQuery: string;
  privacyTier: PrivacyTier;
  dataTypes: string[];
}

// Subset of the enhanced plugin registry for demonstration
const ENHANCED_PLUGIN_REGISTRY: Record<string, PluginConfig> = {
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
  "vision-ocr": {
    id: "vision-ocr",
    workerUrl: "https://us-central1-arc-epi.cloudfunctions.net/visionOcrInvoke",
    requiredTier: "standard",
    capabilities: ["vision", "ocr", "image_understanding"],
    description: "Extract text (OCR) or understand images",
    exampleQuery: "Extract text from this screenshot",
    privacyTier: PrivacyTier.STRUCTURED_PERSONAL,
    dataTypes: ["images", "documents", "personal_files"]
  }
};

function getPluginsForTier(userTier: Tier): Record<string, PluginConfig> {
  const tierRank: Record<Tier, number> = { free: 0, standard: 1, premium: 2 };
  const userRank = tierRank[userTier];

  return Object.fromEntries(
    Object.entries(ENHANCED_PLUGIN_REGISTRY)
      .filter(([_, config]) => tierRank[config.requiredTier] <= userRank)
  );
}

interface Env {
  // No environment variables needed for this read-only service
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GET /plugins - Return all plugins
    if (path === '/plugins' || path === '/') {
      return jsonResponse({
        plugins: ENHANCED_PLUGIN_REGISTRY,
        meta: {
          total: Object.keys(ENHANCED_PLUGIN_REGISTRY).length,
          tiers: ['free', 'standard', 'premium'],
          privacy_tiers: Object.values(PrivacyTier),
        },
      });
    }

    // GET /plugins/{id} - Return specific plugin
    const pluginMatch = path.match(/^\/plugins\/([^\/]+)$/);
    if (pluginMatch) {
      const pluginId = pluginMatch[1];
      const plugin = ENHANCED_PLUGIN_REGISTRY[pluginId];

      if (!plugin) {
        return jsonResponse({ error: 'Plugin not found' }, 404);
      }

      return jsonResponse({ plugin });
    }

    // GET /plugins/tier/{tier} - Return plugins for specific tier
    const tierMatch = path.match(/^\/plugins\/tier\/([^\/]+)$/);
    if (tierMatch) {
      const tier = tierMatch[1] as Tier;

      if (!['free', 'standard', 'premium'].includes(tier)) {
        return jsonResponse({ error: 'Invalid tier' }, 400);
      }

      const plugins = getPluginsForTier(tier);
      return jsonResponse({
        plugins,
        tier,
        count: Object.keys(plugins).length,
      });
    }

    // GET /plugins/privacy/{privacy_tier} - Return plugins by privacy tier
    const privacyMatch = path.match(/^\/plugins\/privacy\/([^\/]+)$/);
    if (privacyMatch) {
      const privacyTier = privacyMatch[1] as PrivacyTier;

      if (!Object.values(PrivacyTier).includes(privacyTier)) {
        return jsonResponse({ error: 'Invalid privacy tier' }, 400);
      }

      const plugins = Object.fromEntries(
        Object.entries(ENHANCED_PLUGIN_REGISTRY)
          .filter(([_, config]) => config.privacyTier === privacyTier)
      );

      return jsonResponse({
        plugins,
        privacy_tier: privacyTier,
        count: Object.keys(plugins).length,
      });
    }

    // GET /plugins/capabilities - Return plugins grouped by capability
    if (path === '/plugins/capabilities') {
      const capabilityGroups: Record<string, string[]> = {};

      Object.entries(ENHANCED_PLUGIN_REGISTRY).forEach(([id, plugin]) => {
        plugin.capabilities.forEach(capability => {
          if (!capabilityGroups[capability]) {
            capabilityGroups[capability] = [];
          }
          capabilityGroups[capability].push(id);
        });
      });

      return jsonResponse({
        capabilities: capabilityGroups,
        total_capabilities: Object.keys(capabilityGroups).length,
      });
    }

    return jsonResponse({
      error: 'Not found',
      available_endpoints: [
        'GET /plugins - All plugins',
        'GET /plugins/{id} - Specific plugin',
        'GET /plugins/tier/{tier} - Plugins by tier',
        'GET /plugins/privacy/{privacy_tier} - Plugins by privacy tier',
        'GET /plugins/capabilities - Plugins by capability',
      ],
    }, 404);
  },
};