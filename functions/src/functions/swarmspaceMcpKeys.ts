import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHmac, randomBytes } from "crypto";
import { enforceAuth } from "../authGuard";

// HMAC signing key used by the Cloudflare MCP Worker to validate keys.
// Set via: firebase functions:secrets:set MCP_KEY_SECRET
const MCP_KEY_SECRET = defineSecret("MCP_KEY_SECRET");

export const generateMcpApiKey = onCall(
  { secrets: [MCP_KEY_SECRET] },
  async (request) => {
    const { userId } = await enforceAuth(request);

    const db = getFirestore();
    const existing = await db
      .collection("mcp_api_keys")
      .where("uid", "==", userId)
      .where("revoked", "==", false)
      .count()
      .get();

    if (existing.data().count >= 5) {
      throw new HttpsError(
        "resource-exhausted",
        "Maximum 5 active MCP API keys allowed. Revoke one first."
      );
    }

    const secret = MCP_KEY_SECRET.value();
    const uidB64 = Buffer.from(userId).toString("base64url");
    const ts = Math.floor(Date.now() / 1000);
    const tsB64 = Buffer.from(String(ts)).toString("base64url");
    const hmacHex = createHmac("sha256", secret)
      .update(`${uidB64}.${tsB64}`)
      .digest("hex");
    const apiKey = `ss_mcp_${uidB64}.${tsB64}.${hmacHex}`;

    const keyId = randomBytes(8).toString("hex");
    const label =
      request.data?.label ?? `Key created ${new Date().toISOString().slice(0, 10)}`;

    // Store only the keyId and uid — the full API key is never persisted.
    await db.collection("mcp_api_keys").doc(keyId).set({
      keyId,
      uid: userId,
      created_at: FieldValue.serverTimestamp(),
      revoked: false,
      label,
    });

    logger.info(`MCP API key generated for user ${userId}, keyId ${keyId}`);

    // apiKey is returned once here and never stored — user must save it.
    return { keyId, apiKey, label, created_at: new Date().toISOString() };
  }
);

export const revokeMcpApiKey = onCall(
  {},
  async (request) => {
    const { userId } = await enforceAuth(request);

    const { keyId } = request.data ?? {};

    if (!keyId || typeof keyId !== "string") {
      throw new HttpsError("invalid-argument", "keyId must be a non-empty string.");
    }

    const db = getFirestore();
    const docRef = db.collection("mcp_api_keys").doc(keyId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError("not-found", "API key not found.");
    }

    // Prevent one user from revoking another user's key.
    if (docSnap.data()!.uid !== userId) {
      throw new HttpsError("permission-denied", "You do not own this API key.");
    }

    await docRef.update({
      revoked: true,
      revoked_at: FieldValue.serverTimestamp(),
    });

    logger.info(`MCP API key ${keyId} revoked by user ${userId}`);

    return { success: true, keyId };
  }
);
