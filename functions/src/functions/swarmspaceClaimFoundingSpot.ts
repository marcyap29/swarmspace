// swarmspaceClaimFoundingSpot.ts
//
// Founding Developer Programme — atomic slot claim.
// 100 spots, first-come, permanent 85% revenue share.
// Uses Firestore transaction to prevent race conditions.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { enforceAuth } from "../authGuard";

export const swarmspaceClaimFoundingSpot = onCall({}, async (request) => {
  const { userId } = await enforceAuth(request);
  const db = getFirestore();

  return db.runTransaction(async (tx) => {
    // 1. Check programme status
    const metaRef = db.doc("founding_programme/meta");
    const metaSnap = await tx.get(metaRef);

    if (!metaSnap.exists) {
      throw new HttpsError("not-found", "Founding Developer Programme not found.");
    }

    const meta = metaSnap.data()!;

    if (!meta.isOpen) {
      throw new HttpsError(
        "failed-precondition",
        "Founding Developer Programme is currently closed."
      );
    }

    if (meta.claimedSlots >= meta.totalSlots) {
      throw new HttpsError(
        "resource-exhausted",
        "All founding developer spots have been claimed.",
        { remainingSlots: 0 }
      );
    }

    // 2. Check if user already claimed
    const devRef = db.doc(`developers/${userId}`);
    const devSnap = await tx.get(devRef);

    if (devSnap.exists && devSnap.data()?.isFoundingDeveloper) {
      const existingSlot = devSnap.data()?.foundingDeveloperSlot;
      throw new HttpsError(
        "already-exists",
        `You already claimed founding developer spot #${existingSlot}.`,
        { slotNumber: existingSlot }
      );
    }

    // 3. Claim the slot atomically
    const slotNumber = meta.claimedSlots + 1;

    tx.update(metaRef, {
      claimedSlots: FieldValue.increment(1),
    });

    tx.set(devRef, {
      isFoundingDeveloper: true,
      foundingDeveloperSlot: slotNumber,
      foundingDeveloperJoinedAt: FieldValue.serverTimestamp(),
      foundingDeveloperRevenueShare: 85,
    }, { merge: true });

    logger.info(
      `Founding developer spot #${slotNumber} claimed by ${userId}`,
      { slotNumber, userId, remainingSlots: meta.totalSlots - slotNumber }
    );

    return {
      success: true,
      slotNumber,
      remainingSlots: meta.totalSlots - slotNumber,
      revenueShare: 85,
      message: `You are Founding Developer #${slotNumber}! Submit your first plugin within 90 days.`,
    };
  });
});
