import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db';
import { findUserById } from '../models/user';
import { verifyAccessToken } from '../models/user';
import { logger } from '../logger';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
});

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Subscription plans
interface Plan {
  id: string;
  name: string;
  price: number;
  swipeLimit: number;
  features: string[];
  priceId?: string;
}

const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    swipeLimit: 10,
    features: ['10 swipes per day', 'Basic matching', 'Profile creation']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_dummy',
    price: 1999,
    swipeLimit: 50,
    features: ['50 swipes per day', 'See who liked you', 'Advanced filters', 'Priority matching', 'Read receipts']
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID || 'price_unlimited_dummy',
    price: 3999,
    swipeLimit: 999999,
    features: ['Unlimited swipes', 'See who liked you', 'Advanced filters', 'Priority matching', 'Read receipts', 'Profile boost', 'AI career coach']
  }
};

// Get current subscription
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC 
       LIMIT 1`,
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        tier: 'free',
        ...PLANS.free,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      });
    }
    
    const sub = result.rows[0];
    const plan = PLANS[sub.tier];
    
    res.json({
      tier: sub.tier,
      ...plan,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get subscription error');
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Get available plans
router.get('/plans', async (req, res) => {
  res.json(PLANS);
});

// Create checkout session
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { planId } = req.body;
    const plan = PLANS[planId];
    
    if (!plan || planId === 'free') {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    if (!plan.priceId) {
      return res.status(400).json({ error: 'Plan not configured' });
    }
    
    // Get or create Stripe customer
    let customerId: string | null = null;
    const existingSub = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    if (existingSub.rows.length > 0 && existingSub.rows[0].stripe_customer_id) {
      customerId = existingSub.rows[0].stripe_customer_id as string;
    } else {
      const user = await findUserById(userId);
      const userEmail = user?.email;
      if (!userEmail) {
        return res.status(400).json({ error: 'User email not found' });
      }
      const customer = await stripe.customers.create({
        email: userEmail!,
        metadata: { userId }
      });
      customerId = customer.id;
    }
    
    if (!customerId) {
      return res.status(400).json({ error: 'Failed to get or create customer' });
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId!,
      line_items: [{
        price: plan.priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${clientUrl}/profile?success=true`,
      cancel_url: `${clientUrl}/profile?canceled=true`,
      metadata: {
        userId,
        planId: planId
      }
    });
    
    if (!session.url) {
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Stripe checkout error');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create billing portal session
router.post('/portal', authenticate, async (req, res) => {
  try {
    const userId = req.userId as string;
    const result = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: result.rows[0].stripe_customer_id,
      return_url: `${clientUrl}/profile`
    });
    
    res.json({ url: session.url });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Stripe portal error');
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  let event;

  if (isProd && !endpointSecret) {
    return res.status(500).send('Webhook signing secret not configured');
  }

  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else if (!isProd) {
      // Dev convenience: accept unsigned events when no secret is configured.
      event = typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString())
        : req.body;
    } else {
      return res.status(400).send('Missing Stripe signature');
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, planId } = session.metadata || {};
        const customer = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && planId && customer && subscriptionId) {
          // Fetch real subscription period from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          await query(
            `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, 'active', to_timestamp($5), to_timestamp($6))
             ON CONFLICT (stripe_subscription_id) DO UPDATE SET
               status = 'active',
               tier = $4,
               current_period_start = to_timestamp($5),
               current_period_end = to_timestamp($6)`,
            [userId, customer, subscriptionId, planId, stripeSub.current_period_start, stripeSub.current_period_end]
          );
          await query('UPDATE users SET subscription_tier = $1 WHERE id = $2', [planId, userId]);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const tier = subscription.metadata?.planId || (subscription.items.data[0]?.price?.id === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'unlimited');
        await query(
          `UPDATE subscriptions
           SET status = $1, tier = $2, current_period_start = to_timestamp($3), current_period_end = to_timestamp($4),
               cancel_at_period_end = $5, updated_at = CURRENT_TIMESTAMP
           WHERE stripe_subscription_id = $6`,
          [subscription.status, tier, subscription.current_period_start, subscription.current_period_end, subscription.cancel_at_period_end, subscription.id]
        );
        await query(
          `UPDATE users SET subscription_tier = $1
           WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $2)`,
          [subscription.status === 'active' ? tier : 'free', subscription.id]
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await query(
            `UPDATE subscriptions
             SET status = 'active', current_period_start = to_timestamp($1), current_period_end = to_timestamp($2)
             WHERE stripe_subscription_id = $3`,
            [stripeSub.current_period_start, stripeSub.current_period_end, invoice.subscription]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await query(
            `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`,
            [invoice.subscription]
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await query(
          `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = true WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
        await query(
          `UPDATE users SET subscription_tier = 'free'
           WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1)`,
          [subscription.id]
        );
        break;
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, 'Webhook processing error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
