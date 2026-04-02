// api/create-connect-account.js
// Vercel Edge Function — creates a Stripe Connect Express account and onboarding link

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { email, firebaseUid } = await req.json();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL || 'https://swarmspace.dev';

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Create Stripe Connect Express account
    const accountRes = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        type: 'express',
        email,
        'metadata[firebase_uid]': firebaseUid
      })
    });
    const account = await accountRes.json();

    if (account.error) {
      throw new Error(account.error.message);
    }

    // Create account link for onboarding
    const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        account: account.id,
        type: 'account_onboarding',
        refresh_url: `${appUrl}/dashboard.html?connect=refresh`,
        return_url: `${appUrl}/dashboard.html?connect=complete`
      })
    });
    const link = await linkRes.json();

    if (link.error) {
      throw new Error(link.error.message);
    }

    return new Response(JSON.stringify({
      url: link.url,
      accountId: account.id
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
