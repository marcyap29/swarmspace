// api/create-checkout.js
// Vercel Edge Function — creates a Stripe Checkout session

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { customerId, email, developerName } = await req.json();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_VERIFIED_PRICE_ID;
  const appUrl = process.env.APP_URL || 'https://swarmspace.dev';

  if (!stripeKey || !priceId) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Create or retrieve Stripe customer
    let customer_id = customerId;

    if (!customer_id) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          email,
          name: developerName || email,
          'metadata[source]': 'swarmspace'
        })
      });
      const customer = await customerRes.json();
      customer_id = customer.id;
    }

    // Create checkout session
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        customer: customer_id,
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: `${appUrl}/dashboard.html?session=success`,
        cancel_url: `${appUrl}/dashboard.html?session=canceled`,
        'subscription_data[metadata][source]': 'swarmspace',
        allow_promotion_codes: 'true'
      })
    });

    const session = await sessionRes.json();

    if (session.error) {
      throw new Error(session.error.message);
    }

    return new Response(JSON.stringify({
      url: session.url,
      customerId: customer_id
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
