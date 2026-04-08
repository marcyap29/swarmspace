// SwarmSpace API Result Types
// Extracted from LUMARA and standardized for backend use

/**
 * Quota information returned with plugin responses
 */
export interface SwarmSpaceQuota {
  limit: number;
  used: number;
  remaining: number;
  resetsAt?: string; // ISO 8601 timestamp
}

/**
 * Standard result wrapper for all SwarmSpace API responses
 */
export interface SwarmSpaceResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  quota?: SwarmSpaceQuota;
}

/**
 * Plugin invocation request format
 */
export interface PluginInvocationRequest {
  plugin_id: string;
  params: Record<string, any>;
  user_tier?: 'free' | 'standard' | 'premium';
}

/**
 * Plugin invocation response format
 */
export interface PluginInvocationResponse extends SwarmSpaceResult {
  plugin_id: string;
  execution_time_ms?: number;
  source?: string;
  count?: number;
}

/**
 * Helper functions for creating standard responses
 */
export class SwarmSpaceResponse {
  static success(data: Record<string, any>, quota?: SwarmSpaceQuota): SwarmSpaceResult {
    return { success: true, data, quota };
  }

  static error(message: string, quota?: SwarmSpaceQuota): SwarmSpaceResult {
    return { success: false, error: message, quota };
  }

  static pluginSuccess(
    pluginId: string,
    data: Record<string, any>,
    quota?: SwarmSpaceQuota,
    executionTimeMs?: number
  ): PluginInvocationResponse {
    return {
      success: true,
      plugin_id: pluginId,
      data,
      quota,
      execution_time_ms: executionTimeMs
    };
  }

  static pluginError(
    pluginId: string,
    message: string,
    quota?: SwarmSpaceQuota
  ): PluginInvocationResponse {
    return {
      success: false,
      plugin_id: pluginId,
      error: message,
      quota
    };
  }
}