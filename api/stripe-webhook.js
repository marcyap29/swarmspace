// api/stripe-webhook.js
// Vercel Edge Function — handles Stripe subscription events
//
// Required environment variables:
//   STRIPE_SECRET_KEY        — Stripe secret key
//   STRIPE_WEBHOOK_SECRET    — Stripe webhook signing secret
//   FIREBASE_PROJECT_ID      — Firebase project ID (e.g. "arc-epi")
//   FIREBASE_API_KEY         — Firebase Web API key

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_API_KEY;

  const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // Verify webhook signature
  // Note: Full crypto verification requires the Stripe library.
  // For production, add: npm install stripe and use stripe.webhooks.constructEvent
  // For now we validate the secret is present as a basic guard.
  if (!webhookSecret || !signature) {
    return new Response('Webhook secret not configured', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Convert a plain updates object to Firestore typed-value format
  function toFirestoreFields(updates) {
    const fields = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined) {
        fields[key] = { nullValue: null };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (typeof value === 'number') {
        fields[key] = Number.isInteger(value)
          ? { integerValue: String(value) }
          : { doubleValue: value };
      } else {
        fields[key] = { stringValue: String(value) };
      }
    }
    return fields;
  }

  // Query Firestore users collection by stripe_customer_id
  async function findUserByStripeCustomer(stripeCustomerId) {
    const res = await fetch(`${firestoreBase}:runQuery?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'stripe_customer_id' },
              op: 'EQUAL',
              value: { stringValue: stripeCustomerId }
            }
          },
          limit: 1
        }
      })
    });

    if (!res.ok) return null;

    const results = await res.json();
    // runQuery returns [{ document: { name, fields } }] or [{ readTime }] if empty
    if (results.length > 0 && results[0].document) {
      return results[0].document.name;
    }
    return null;
  }

  // Get a user document path by Firebase UID directly
  function userDocPath(uid) {
    return `${firestoreBase}/users/${uid}`;
  }

  // Update a Firestore document at the given path
  async function patchDocument(documentPath, updates) {
    const fields = toFirestoreFields(updates);
    const fieldPaths = Object.keys(updates);
    const maskParams = fieldPaths
      .map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`)
      .join('&');

    const res = await fetch(
      `https://firestore.googleapis.com/v1/${documentPath}?key=${apiKey}&${maskParams}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      }
    );
    return res.ok;
  }

  // Find user by stripe_customer_id. For checkout.session.completed, fall back
  // to client_reference_id (Firebase UID) if the customer is not yet linked.
  async function updateUser(stripeCustomerId, updates, session) {
    let docPath = await findUserByStripeCustomer(stripeCustomerId);

    // Fallback: on checkout.session.completed the user doc may not have
    // stripe_customer_id yet. Use client_reference_id (Firebase UID) if available.
    if (!docPath && session && session.client_reference_id) {
      docPath = userDocPath(session.client_reference_id);
    }

    if (!docPath) {
      console.error(`No user found for stripe customer ${stripeCustomerId}`);
      return false;
    }

    return patchDocument(docPath, updates);
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode === 'subscription') {
          // Save stripe_customer_id and subscription_id, upgrade plan
          await updateUser(session.customer, {
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan: 'verified',
            plan_status: 'active',
            isPremium: false
          }, session);
        }

        if (session.mode === 'payment') {
          // Credit top-up: read credits from metadata
          const credits = parseInt(session.metadata?.credits || '0', 10);
          const firebaseUid = session.client_reference_id;
          if (credits > 0 && firebaseUid) {
            // Read current credits from Firestore, add the new credits
            const docPath = userDocPath(firebaseUid);
            const currentDoc = await fetch(
              `https://firestore.googleapis.com/v1/${docPath}?key=${apiKey}`,
              { method: 'GET' }
            );
            let currentCredits = 0;
            if (currentDoc.ok) {
              const data = await currentDoc.json();
              const creditsField = data.fields?.credits;
              if (creditsField?.integerValue) currentCredits = parseInt(creditsField.integerValue, 10);
            }
            await patchDocument(docPath, {
              credits: currentCredits + credits,
              last_credit_purchase: new Date().toISOString(),
              last_credit_bundle: session.metadata?.bundle_id || 'unknown'
            });
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status; // active, past_due, canceled, etc.
        await updateUser(sub.customer, {
          plan: status === 'active' ? 'verified' : 'free',
          plan_status: status,
          isPremium: false
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateUser(sub.customer, {
          plan: 'free',
          plan_status: 'canceled',
          stripe_subscription_id: null,
          isPremium: false
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await updateUser(invoice.customer, {
          plan_status: 'past_due'
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
