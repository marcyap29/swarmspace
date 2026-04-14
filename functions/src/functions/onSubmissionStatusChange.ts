// onSubmissionStatusChange.ts - Promotion pipeline trigger
//
// Firestore trigger that fires when a plugin_submissions document is updated.
// On approved transitions, promotes the submission to approved_plugins.
// Idempotent: checks for existing approved_plugins doc before writing.

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";

// ── Valid status transitions ────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "needs-info"],
  "needs-info": ["approved", "rejected"],
  approved: ["rejected"],
};

const PERSONAL_DATA_TYPES = ["images", "documents", "personal_files"];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Slugify a plugin name into a valid plugin_id.
 * Lowercase, replace non-alphanumeric with hyphens, collapse runs, trim to 50 chars.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Derive privacyTier from privacy_data_required array.
 */
function derivePrivacyTier(privacyData: string[]): string {
  if (!privacyData || privacyData.length === 0) return "anonymous";
  if (privacyData.some((d) => PERSONAL_DATA_TYPES.includes(d))) return "structured_personal";
  return "user_content";
}

// ── Cloud Function ──────────────────────────────────────────────────────────

export const onSubmissionStatusChange = onDocumentUpdated(
  "plugin_submissions/{docId}",
  async (event) => {
    const docId = event.params.docId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.warn("onSubmissionStatusChange: missing before/after data", { docId });
      return;
    }

    const beforeStatus = beforeData.status as string;
    const afterStatus = afterData.status as string;

    // Ignore no-op transitions
    if (beforeStatus === afterStatus) {
      return;
    }

    // Validate transition
    const allowedTargets = VALID_TRANSITIONS[beforeStatus];
    if (!allowedTargets || !allowedTargets.includes(afterStatus)) {
      logger.warn("onSubmissionStatusChange: invalid transition", {
        docId,
        from: beforeStatus,
        to: afterStatus,
      });
      return;
    }

    // ── Handle revocation: approved → rejected ──────────────────────────

    if (beforeStatus === "approved" && afterStatus === "rejected") {
      const db = getFirestore();
      const pluginName = (afterData.plugin_name || afterData.name || docId) as string;
      const pluginId = slugify(pluginName);
      const approvedRef = db.collection("approved_plugins").doc(pluginId);
      const approvedDoc = await approvedRef.get();

      if (approvedDoc.exists) {
        await approvedRef.delete();
        logger.info(`Revoked plugin ${pluginId} — removed from approved_plugins`, {
          plugin_id: pluginId,
          submission_id: docId,
          revoked_by: afterData.reviewed_by,
        });
      } else {
        logger.warn(`Revocation: approved_plugins/${pluginId} not found (may have been removed already)`);
      }

      return;
    }

    // Log-only transitions (rejected, needs-info)
    if (afterStatus !== "approved") {
      logger.info("onSubmissionStatusChange: status changed (no promotion action)", {
        docId,
        from: beforeStatus,
        to: afterStatus,
      });
      return;
    }

    // ── Approved transition ───────────────────────────────────────────────

    logger.info("onSubmissionStatusChange: approved transition detected", {
      docId,
      from: beforeStatus,
    });

    const db = getFirestore();
    const submission = afterData;

    // Generate plugin_id from name
    const pluginName = (submission.plugin_name || submission.name || docId) as string;
    const pluginId = slugify(pluginName);

    if (!pluginId) {
      logger.error("onSubmissionStatusChange: could not generate plugin_id", {
        docId,
        pluginName,
      });
      return;
    }

    // Idempotency check — skip if already promoted
    const approvedRef = db.collection("approved_plugins").doc(pluginId);
    const existing = await approvedRef.get();
    if (existing.exists) {
      logger.info("onSubmissionStatusChange: approved_plugins doc already exists, skipping", {
        docId,
        pluginId,
      });
      return;
    }

    // Derive fields
    const privacyData = (submission.privacy_data_required || []) as string[];
    const privacyTier = derivePrivacyTier(privacyData);
    const now = new Date().toISOString();

    // Build PluginConfig-shaped document
    const pluginConfig = {
      workerUrl: submission.endpoint_url,
      requiredTier: submission.access_tier || "free",
      capabilities: submission.capabilities || submission.semantic_tags || [],
      description: submission.description,
      exampleQuery: submission.example_query || "",
      privacy_data_required: privacyData,
      privacyTier,
      dataTypes: privacyData,
      owner: submission.developer_uid,
      author: {
        name: submission.developer_email,
        type: "developer",
      },
      pricing: {
        model: (submission.pricing_model === "Credits" || submission.pricing_model === "per_call") ? "per_call"
          : submission.pricing_model === "subscription" ? "subscription"
          : "included",
        cost_per_call: null,
      },
      version: submission.version || "1.0.0",
      deployed_at: now,
      rateLimits: submission.rate_limits || { free: 20, standard: 500, premium: 500 },
      source: "developer",
      submission_id: docId,
      approved_at: now,
      approved_by: submission.reviewed_by || "unknown",
    };

    // Write to approved_plugins
    await approvedRef.set(pluginConfig);

    logger.info("onSubmissionStatusChange: plugin promoted to approved_plugins", {
      docId,
      pluginId,
      owner: submission.developer_uid,
    });
  }
);
