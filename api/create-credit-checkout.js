// api/create-credit-checkout.js
// Vercel Edge Function — creates a Stripe Checkout session for one-time credit purchases

export const config = { runtime: 'edge' };

const BUNDLES = {
  starter:  { credits: 100,  price_cents: 500  },
  standard: { credits: 400,  price_cents: 1500 },
  bulk:     { credits: 1000, price_cents: 3000 }
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { bundleId, email, firebaseUid } = await req.json();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL || 'https://swarmspace.dev';

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const bundle = BUNDLES[bundleId];
  if (!bundle) {
    return new Response(JSON.stringify({ error: 'Invalid bundle ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Create or retrieve Stripe customer
    const customerRes = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        email,
        'metadata[source]': 'swarmspace',
        'metadata[firebase_uid]': firebaseUid
      })
    });
    const customer = await customerRes.json();

    // Create checkout session for one-time payment
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        customer: customer.id,
        mode: 'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(bundle.price_cents),
        'line_items[0][price_data][product_data][name]': `SwarmSpace Credits — ${bundleId}`,
        'line_items[0][price_data][product_data][description]': `${bundle.credits} API credits`,
        'line_items[0][quantity]': '1',
        'metadata[bundle_id]': bundleId,
        'metadata[credits]': String(bundle.credits),
        'metadata[firebase_uid]': firebaseUid,
        client_reference_id: firebaseUid,
        success_url: `${appUrl}/dashboard.html?credits=success`,
        cancel_url: `${appUrl}/dashboard.html?credits=canceled`
      })
    });

    const session = await sessionRes.json();

    if (session.error) {
      throw new Error(session.error.message);
    }

    return new Response(JSON.stringify({
      url: session.url,
      customerId: customer.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
