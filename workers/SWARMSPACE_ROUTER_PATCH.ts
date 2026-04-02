// ════════════════════════════════════════════════════════════════════════════════
// PATCH: Atomic credit enforcement + daily call tracking for swarmspaceRouter.ts
// ════════════════════════════════════════════════════════════════════════════════
//
// Apply to: ARCv2.5/functions/src/functions/swarmspaceRouter.ts
//
// This file contains the code to add between Step 4 (tier check) and Step 4b
// (LLM key override) in the swarmspaceRouter onCall handler.
//
// It also includes supporting constants and the quota wrapper for the response.
//
// ── HOW TO APPLY ──────────────────────────────────────────────────────────────
//
// 1. Add the imports and constants (Section A) near the top of the file
// 2. Add the enforcement function (Section B) after the effectiveUserTier function
// 3. Insert the enforcement call (Section C) in the onCall handler between
//    Step 4 (tier check) and Step 4b (LLM key override)
// 4. Wrap the return value (Section D) at the end of the handler
// ════════════════════════════════════════════════════════════════════════════════

// ── SECTION A: Add these imports and constants ────────────────────────────────
// Add to existing imports:
import { FieldValue } from "firebase-admin/firestore";
// (getFirestore is already imported)

// Add after PLUGIN_ACTIVITY_COLLECTION:
const SWARMSPACE_USAGE_COLLECTION = "swarmspace_usage";

// Daily call limits per tier. Admin users bypass all limits.
const TIER_DAILY_LIMITS: Record<Tier, number> = {
  free: 20,
  standard: 500,
  premium: 500,  // same as standard for now; increase when premium launches
};

// ── SECTION B: Add this function after effectiveUserTier() ────────────────────

interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
}

/**
 * Enforce daily call limits atomically.
 *
 * Uses a dedicated swarmspace_usage/{userId}_daily document with:
 *   - count: number of calls today
 *   - windowStart: Firestore Timestamp of when the current window began
 *
 * On each call:
 *   1. Read current usage
 *   2. If windowStart is before today's midnight UTC, reset count to 0
 *   3. If count >= limit, throw resource-exhausted
 *   4. Atomically increment count
 *   5. Return quota info for the response
 *
 * Admin users are unlimited (returns limit: -1).
 */
async function enforceSwarmSpaceQuota(
  userId: string,
  userTier: Tier,
  isAdmin: boolean
): Promise<QuotaInfo> {
  // Admin users bypass all limits
  if (isAdmin) {
    return { limit: -1, used: 0, remaining: -1, resets_at: "" };
  }

  const db = getFirestore();
  const limit = TIER_DAILY_LIMITS[userTier] ?? TIER_DAILY_LIMITS.free;
  const usageRef = db.collection(SWARMSPACE_USAGE_COLLECTION).doc(`${userId}_daily`);

  // Calculate today's midnight UTC (window boundary)
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

  const usageDoc = await usageRef.get();
  let currentCount = 0;
  let needsReset = false;

  if (usageDoc.exists) {
    const data = usageDoc.data()!;
    const windowStart = data.windowStart;

    // Check if the window has expired (windowStart is before today's midnight)
    if (windowStart && typeof windowStart.toMillis === "function") {
      if (windowStart.toMillis() < todayMidnight.getTime()) {
        needsReset = true;
        currentCount = 0;
      } else {
        currentCount = data.count || 0;
      }
    } else {
      // No valid windowStart — treat as new window
      needsReset = true;
      currentCount = 0;
    }
  } else {
    needsReset = true;
  }

  // Check ceiling BEFORE incrementing
  if (currentCount >= limit) {
    logger.warn(
      `SwarmSpace quota exceeded: user=${userId} tier=${userTier} used=${currentCount}/${limit}`
    );
    throw new HttpsError(
      "resource-exhausted",
      `Daily call limit reached (${currentCount}/${limit}). Resets at midnight UTC.`,
      {
        quota: {
          limit,
          used: currentCount,
          remaining: 0,
          resets_at: tomorrowMidnight.toISOString(),
        },
        upgrade_url: "https://swarmspace.ai/upgrade",
      }
    );
  }

  // Atomically increment (or reset + set to 1)
  if (needsReset) {
    await usageRef.set({
      userId,
      count: 1,
      windowStart: todayMidnight,
      updatedAt: FieldValue.serverTimestamp(),
    });
    currentCount = 1;
  } else {
    await usageRef.update({
      count: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    currentCount += 1;
  }

  const remaining = Math.max(0, limit - currentCount);

  // Log 80% warning
  if (remaining > 0 && currentCount >= limit * 0.8) {
    logger.info(
      `SwarmSpace quota 80% warning: user=${userId} tier=${userTier} used=${currentCount}/${limit}`
    );
  }

  return {
    limit,
    used: currentCount,
    remaining,
    resets_at: tomorrowMidnight.toISOString(),
  };
}


// ── SECTION C: Insert in the onCall handler ───────────────────────────────────
// Add this block AFTER the existing Step 4 tier check and BEFORE Step 4b.
// You also need to detect isAdmin from the request to pass to enforceSwarmSpaceQuota.

// --- Add this right after the logger.info line ("SwarmSpace router: user=...") ---

    // Step 4a: Enforce daily call quota (atomic check-increment-or-block)
    const requestEmail = request.auth?.token?.email as string | undefined;
    const isAdminUser = isAdminEmail(requestEmail);
    const quota = await enforceSwarmSpaceQuota(userId, userTier, isAdminUser);

// --- End of insertion ---


// ── SECTION D: Wrap the return value ──────────────────────────────────────────
// Replace the final return statement:
//
//   return workerBody;
//
// With:

    // Attach quota info to every successful response
    const responseWithQuota = {
      ...(typeof workerBody === "object" && workerBody !== null ? workerBody : { data: workerBody }),
      quota,
    };
    return responseWithQuota;

// ── END OF PATCH ──────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════════════════
// FIRESTORE NOTES
// ════════════════════════════════════════════════════════════════════════════════
//
// Collection: swarmspace_usage
// Document ID: {userId}_daily
// Fields:
//   - userId: string
//   - count: number (calls today)
//   - windowStart: Timestamp (midnight UTC of current day)
//   - updatedAt: Timestamp (server timestamp)
//
// No composite indexes needed — lookups are by document ID only.
//
// IMPORTANT: The `developers` collection (used by enforceAuth) is separate from
// the `users` collection (used by the SwarmSpace web dashboard). The web app
// creates docs in `users/{uid}` on signup; the LUMARA app creates docs in
// `developers/{uid}` via enforceAuth. Both need to coexist. The quota system
// uses its own `swarmspace_usage` collection to avoid coupling to either.
//
// ════════════════════════════════════════════════════════════════════════════════
// RESPONSE FORMAT
// ════════════════════════════════════════════════════════════════════════════════
//
// Every successful response now includes:
// {
//   ...pluginResponse,
//   quota: {
//     limit: 20,        // daily limit for this tier
//     used: 3,          // calls used today (including this one)
//     remaining: 17,    // calls left today
//     resets_at: "2026-04-03T00:00:00.000Z"  // next midnight UTC
//   }
// }
//
// On quota exceeded (HTTP 429 / resource-exhausted):
// {
//   error: "Daily call limit reached (20/20). Resets at midnight UTC.",
//   details: {
//     quota: { limit: 20, used: 20, remaining: 0, resets_at: "..." },
//     upgrade_url: "https://swarmspace.ai/upgrade"
//   }
// }
