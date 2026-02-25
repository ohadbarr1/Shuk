// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events to sync subscription status
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response('Invalid signature', { status: 400 });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.subscription
                    ? (await stripe.subscriptions.retrieve(session.subscription as string)).metadata.supabase_user_id
                    : session.metadata?.supabase_user_id;

                if (userId && session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                    await supabase.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: subscription.id,
                        plan: 'premium',
                        status: 'active',
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    }, { onConflict: 'user_id' });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata.supabase_user_id;
                if (userId) {
                    const status = subscription.status === 'active' || subscription.status === 'trialing'
                        ? 'active'
                        : subscription.status === 'past_due' ? 'past_due' : 'canceled';

                    await supabase.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_subscription_id: subscription.id,
                        plan: status === 'canceled' ? 'free' : 'premium',
                        status,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    }, { onConflict: 'user_id' });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata.supabase_user_id;
                if (userId) {
                    await supabase.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_subscription_id: subscription.id,
                        plan: 'free',
                        status: 'canceled',
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    }, { onConflict: 'user_id' });
                }
                break;
            }
        }
    } catch (err) {
        console.error('Webhook handler error:', err);
        return new Response('Webhook handler error', { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
});
