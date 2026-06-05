// functions/src/functions/anonymizeActivityLogs.ts
//
// Privacy retention scheduled function.
// Runs daily at 02:00 UTC.
//
// Two passes, sequential:
//   1. Strip user_id from plugin_activity_log records older than 90 days.
//      Mark each with anonymized: true so it is skipped on subsequent runs.
//   2. Delete swarmspace_usage daily counters whose windowStart is older
//      than 90 days — the quota window has closed, no analytics value.
//
// Each pass is wrapped in its own try/catch. A failure in one pass does
// not block the other, and neither pass throws — a partial run is better
// than a full failure that blocks the scheduler from retrying.

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const BATCH_LIMIT = 400;
const RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const anonymizeActivityLogs = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    const cutoffTs = Timestamp.fromDate(
      new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY),
    );

    await anonymizePluginActivityLogs(cutoffTs);
    await deleteStaleUsageCounters(cutoffTs);
  },
);

async function anonymizePluginActivityLogs(cutoff: Timestamp): Promise<void> {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection("plugin_activity_log")
      .where("anonymized", "!=", true)
      .where("called_at", "<", cutoff)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      logger.info("anonymizeActivityLogs: no plugin_activity_log records to anonymize");
      return;
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        user_id: FieldValue.delete(),
        anonymized: true,
      });
    }
    await batch.commit();

    logger.info(`anonymizeActivityLogs: anonymized ${snapshot.size} records`);

    if (snapshot.size === BATCH_LIMIT) {
      logger.warn(
        "anonymizeActivityLogs: hit batch limit; more records may remain and will be processed on the next daily run",
      );
    }
  } catch (err) {
    logger.error("anonymizeActivityLogs: failed to anonymize plugin_activity_log", err);
  }
}

async function deleteStaleUsageCounters(cutoff: Timestamp): Promise<void> {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection("swarmspace_usage")
      .where("windowStart", "<", cutoff)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      logger.info("anonymizeActivityLogs: no stale swarmspace_usage counters to delete");
      return;
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    logger.info(`anonymizeActivityLogs: deleted ${snapshot.size} stale usage counters`);
  } catch (err) {
    logger.error("anonymizeActivityLogs: failed to delete stale swarmspace_usage counters", err);
  }
}
