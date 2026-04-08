// Quota Management System
// Based on patterns from LUMARA's plugin activity logging

import { Tier } from './plugin-registry';

/**
 * Quota limits by tier
 */
export const TIER_QUOTAS: Record<Tier, number> = {
  free: 20,
  standard: 200,
  premium: 1000
};

/**
 * Quota tracking for a user
 */
export interface UserQuota {
  userId: string;
  tier: Tier;
  used: number;
  limit: number;
  remaining: number;
  resetTime: Date;
  period: 'daily' | 'monthly';
}

/**
 * Quota usage record for tracking
 */
export interface QuotaUsageRecord {
  userId: string;
  pluginId: string;
  timestamp: Date;
  tier: Tier;
  cost: number; // Number of quota units consumed
}

/**
 * Quota service interface for different implementations
 */
export interface QuotaService {
  /**
   * Get current quota status for user
   */
  getQuota(userId: string): Promise<UserQuota>;

  /**
   * Check if user has enough quota for operation
   */
  checkQuota(userId: string, cost?: number): Promise<boolean>;

  /**
   * Consume quota for user operation
   */
  consumeQuota(userId: string, pluginId: string, cost?: number): Promise<UserQuota>;

  /**
   * Reset quota for user (typically called on schedule)
   */
  resetQuota(userId: string): Promise<UserQuota>;

  /**
   * Get usage history for user
   */
  getUsageHistory(userId: string, days?: number): Promise<QuotaUsageRecord[]>;
}

/**
 * Calculate quota reset time (daily at midnight UTC)
 */
export function getQuotaResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get current quota period identifier (YYYY-MM-DD for daily)
 */
export function getCurrentQuotaPeriod(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Calculate quota cost for a plugin operation
 * Most plugins cost 1 unit, but some premium operations may cost more
 */
export function getQuotaCost(pluginId: string, tier: Tier): number {
  // Premium plugins on free tier cost more (if allowed)
  const baseCost = 1;

  // Vision and premium AI plugins cost more
  if (pluginId === 'vision-ocr' && tier === 'free') return 5;
  if (pluginId === 'perplexity-sonar') return 2;

  return baseCost;
}

/**
 * Create initial quota for new user
 */
export function createInitialQuota(userId: string, tier: Tier): UserQuota {
  const limit = TIER_QUOTAS[tier];
  return {
    userId,
    tier,
    used: 0,
    limit,
    remaining: limit,
    resetTime: getQuotaResetTime(),
    period: 'daily'
  };
}

/**
 * Update quota after consumption
 */
export function updateQuotaUsage(quota: UserQuota, cost: number): UserQuota {
  const newUsed = quota.used + cost;
  return {
    ...quota,
    used: newUsed,
    remaining: Math.max(0, quota.limit - newUsed)
  };
}

/**
 * Check if quota needs reset (new day)
 */
export function needsQuotaReset(quota: UserQuota): boolean {
  return new Date() >= quota.resetTime;
}

/**
 * Reset quota for new period
 */
export function resetQuotaForNewPeriod(quota: UserQuota): UserQuota {
  return {
    ...quota,
    used: 0,
    remaining: quota.limit,
    resetTime: getQuotaResetTime()
  };
}