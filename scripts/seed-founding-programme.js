#!/usr/bin/env node
// Seed the founding_programme/meta document in Firestore
// Run: node scripts/seed-founding-programme.js

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "arc-epi" });
const db = admin.firestore();

async function seed() {
  const ref = db.doc("founding_programme/meta");
  const existing = await ref.get();

  if (existing.exists) {
    console.log("Document already exists:", existing.data());
    console.log("To reset, delete it in Firebase Console first.");
    process.exit(0);
  }

  await ref.set({
    totalSlots: 100,
    claimedSlots: 0,
    isOpen: true,
    openedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("Seeded founding_programme/meta:");
  console.log("  totalSlots: 100");
  console.log("  claimedSlots: 0");
  console.log("  isOpen: true");
}

seed().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
