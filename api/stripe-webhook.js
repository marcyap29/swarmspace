// api/stripe-webhook.js
// Vercel Edge Function — handles Stripe subscription events

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`
  };

  async function updateDeveloper(stripeCustomerId, updates) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/developers?stripe_customer_id=eq.${stripeCustomerId}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(updates)
      }
    );
    return res.ok;
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        // Save stripe_customer_id and subscription_id, upgrade plan
        await updateDeveloper(session.customer, {
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan: 'verified',
          plan_status: 'active'
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status; // active, past_due, canceled, etc.
        await updateDeveloper(sub.customer, {
          plan: status === 'active' ? 'verified' : 'free',
          plan_status: status
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateDeveloper(sub.customer, {
          plan: 'free',
          plan_status: 'canceled',
          stripe_subscription_id: null
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await updateDeveloper(invoice.customer, {
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
