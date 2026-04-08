// Enhanced tier tool definitions with privacy classifications
// Integrates with the enhanced plugin registry from LUMARA

import { ENHANCED_PLUGIN_REGISTRY, getPluginsForTier, canAccessPlugin } from "../../../lib/types/plugin-registry";
import { PrivacyTier } from "../../../lib/types/privacy-tiers";

export type Tier = "free" | "standard" | "premium";

export interface ToolInfo {
  id: string;
  description: string;
  privacyTier: PrivacyTier;
  capabilities: string[];
}

/**
 * Get available tools for a tier using the enhanced plugin registry
 */
export function getToolsForTier(tier: Tier): ToolInfo[] {
  const plugins = getPluginsForTier(tier);
  return Object.values(plugins).map(plugin => ({
    id: plugin.id,
    description: plugin.description,
    privacyTier: plugin.privacyTier,
    capabilities: plugin.capabilities
  }));
}

/**
 * Format tool list for LLM prompt with enhanced metadata
 */
export function formatToolListForPrompt(tools: ToolInfo[]): string {
  return tools.map((t) => {
    const privacy = t.privacyTier === PrivacyTier.STRUCTURED_PERSONAL
      ? " (requires user consent for personal data)"
      : "";
    return `- ${t.id}: ${t.description}${privacy}`;
  }).join("\n");
}

/**
 * Get tool IDs available for a tier
 */
export function getToolIds(tier: Tier): Set<string> {
  return new Set(getToolsForTier(tier).map((t) => t.id));
}

/**
 * Check if a plan requires tools above the user's tier
 */
export function planRequiresPremium(
  toolsRequired: string[],
  tier: Tier
): boolean {
  return toolsRequired.some((toolId) => !canAccessPlugin(tier, toolId));
}

/**
 * Get privacy-sensitive tools that require user consent
 */
export function getPrivacySensitiveTools(tools: ToolInfo[]): ToolInfo[] {
  return tools.filter(tool =>
    tool.privacyTier === PrivacyTier.USER_CONTENT ||
    tool.privacyTier === PrivacyTier.STRUCTURED_PERSONAL
  );
}

/**
 * Check if any tools in the plan require user consent
 */
export function planRequiresConsent(toolsRequired: string[]): boolean {
  return toolsRequired.some(toolId => {
    const plugin = ENHANCED_PLUGIN_REGISTRY[toolId];
    return plugin && plugin.privacyTier !== PrivacyTier.ANONYMOUS;
  });
}
