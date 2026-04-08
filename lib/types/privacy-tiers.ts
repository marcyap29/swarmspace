// Privacy and Consent Management Types
// Extracted from LUMARA's PRISM service for server-side enforcement

/**
 * Privacy sensitivity tiers for plugin data classification
 * Based on LUMARA's PRISM consent system
 */
export enum PrivacyTier {
  /** No personal data; call proceeds without consent UI */
  ANONYMOUS = 'anonymous',

  /** User-generated content (URL, text); lightweight consent once per plugin */
  USER_CONTENT = 'user_content',

  /** Sensitive personal data (image, document); full consent required every time */
  STRUCTURED_PERSONAL = 'structured_personal'
}

/**
 * Plugin privacy classification with consent requirements
 */
export interface PluginPrivacyInfo {
  tier: PrivacyTier;
  dataTypes: string[];
  description: string;
  requiresConsent: boolean;
  persistentApproval: boolean; // false for STRUCTURED_PERSONAL
}

/**
 * Privacy tier configurations
 */
export const PRIVACY_TIER_CONFIG: Record<PrivacyTier, PluginPrivacyInfo> = {
  [PrivacyTier.ANONYMOUS]: {
    tier: PrivacyTier.ANONYMOUS,
    dataTypes: ['public_data', 'api_responses'],
    description: 'No personal data processed',
    requiresConsent: false,
    persistentApproval: true
  },

  [PrivacyTier.USER_CONTENT]: {
    tier: PrivacyTier.USER_CONTENT,
    dataTypes: ['user_text', 'urls', 'queries'],
    description: 'User-generated content and queries',
    requiresConsent: true,
    persistentApproval: true
  },

  [PrivacyTier.STRUCTURED_PERSONAL]: {
    tier: PrivacyTier.STRUCTURED_PERSONAL,
    dataTypes: ['images', 'documents', 'personal_files'],
    description: 'Sensitive personal documents and images',
    requiresConsent: true,
    persistentApproval: false // Always require fresh consent
  }
};

/**
 * Determine if a plugin requires user consent based on privacy tier
 */
export function requiresUserConsent(tier: PrivacyTier): boolean {
  return PRIVACY_TIER_CONFIG[tier].requiresConsent;
}

/**
 * Check if consent can be stored persistently for this privacy tier
 */
export function allowsPersistentApproval(tier: PrivacyTier): boolean {
  return PRIVACY_TIER_CONFIG[tier].persistentApproval;
}

/**
 * Get human-readable privacy description
 */
export function getPrivacyDescription(tier: PrivacyTier): string {
  return PRIVACY_TIER_CONFIG[tier].description;
}