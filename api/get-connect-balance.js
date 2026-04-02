// api/get-connect-balance.js
// Vercel Edge Function — retrieves Stripe Connect account balance

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { connectAccountId } = await req.json();

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!connectAccountId) {
    return new Response(JSON.stringify({ error: 'Missing connectAccountId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const balanceRes = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Stripe-Account': connectAccountId
      }
    });
    const balance = await balanceRes.json();

    if (balance.error) {
      throw new Error(balance.error.message);
    }

    // Extract available and pending amounts (in cents, USD)
    const available = balance.available
      ?.filter(b => b.currency === 'usd')
      .reduce((sum, b) => sum + b.amount, 0) || 0;
    const pending = balance.pending
      ?.filter(b => b.currency === 'usd')
      .reduce((sum, b) => sum + b.amount, 0) || 0;

    return new Response(JSON.stringify({ available, pending }), {
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
