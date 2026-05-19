import { Router, Request, Response } from 'express';
import { getSwipeLimit } from '../models/user';
import { query } from '../db';
import { logger } from '../logger';
import { authenticate } from '../middleware/auth';

const router = Router();

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: null,
    features: ['10 swipes per day', 'Basic matching', 'Profile creation']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    period: 'month',
    features: ['50 swipes per day', 'See who liked you', 'Advanced filters', 'Priority matching', 'Read receipts']
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 39.99,
    period: 'month',
    features: ['Unlimited swipes', 'See who liked you', 'Advanced filters', 'Priority matching', 'Read receipts', 'Profile boost', 'AI career coach']
  }
];

router.get('/subscription', authenticate, async (req: Request, res: Response) => {
  try {
    const userResult = await query(
      `SELECT subscription_tier, subscription_expires_at FROM users WHERE id = $1`,
      [req.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { subscription_tier, subscription_expires_at } = userResult.rows[0];

    // Check if paid subscription has expired
    const tier = (subscription_tier !== 'free' && subscription_expires_at && new Date(subscription_expires_at) < new Date())
      ? 'free'
      : subscription_tier;

    const subResult = await query(
      `SELECT stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );

    const sub = subResult.rows[0] || null;
    const swipeLimit = getSwipeLimit(tier);

    res.json({
      tier,
      status: sub?.status || 'active',
      cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      currentPeriodEnd: sub?.current_period_end || null,
      features: {
        dailySwipes: swipeLimit,
        seeWhoLikedYou: tier !== 'free',
        priorityMatching: tier !== 'free',
        advancedFilters: tier !== 'free',
        profileBoost: tier === 'unlimited',
        aiCareerCoach: tier === 'unlimited',
      }
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get subscription error');
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.get('/plans', async (_req: Request, res: Response) => {
  res.json(PLANS);
});

router.post('/subscribe', authenticate, async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;
    if (!['pro', 'unlimited'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    // Delegate to Stripe route if configured, otherwise inform client
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/stripe/checkout>; rel="successor-version"');
    res.json({
      message: 'Payments are handled by Stripe checkout. Please call /api/stripe/checkout.',
      planId,
      checkoutPath: '/api/stripe/checkout',
      stripeAvailable: !!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('dummy')
    });
  } catch (err) {
    logger.error({ err }, 'Initiate subscription error');
    res.status(500).json({ error: 'Failed to initiate subscription' });
  }
});

export default router;
