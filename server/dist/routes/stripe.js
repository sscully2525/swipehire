"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const user_1 = require("../models/user");
const user_2 = require("../models/user");
const router = (0, express_1.Router)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2023-10-16',
});
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = (0, user_2.verifyAccessToken)(token);
        req.userId = decoded.userId;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
const PLANS = {
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
        const result = await (0, db_1.query)(`SELECT * FROM subscriptions 
       WHERE user_id = $1 AND status IN ('active', 'trialing')
       ORDER BY created_at DESC 
       LIMIT 1`, [req.userId]);
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
    }
    catch (error) {
        console.error('Get subscription error:', error);
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
        const userId = req.userId;
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
        let customerId = null;
        const existingSub = await (0, db_1.query)('SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1', [userId]);
        if (existingSub.rows.length > 0 && existingSub.rows[0].stripe_customer_id) {
            customerId = existingSub.rows[0].stripe_customer_id;
        }
        else {
            const user = await (0, user_1.findUserById)(userId);
            const userEmail = user?.email;
            if (!userEmail) {
                return res.status(400).json({ error: 'User email not found' });
            }
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { userId }
            });
            customerId = customer.id;
        }
        if (!customerId) {
            return res.status(400).json({ error: 'Failed to get or create customer' });
        }
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
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
    }
    catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});
// Create billing portal session
router.post('/portal', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const result = await (0, db_1.query)('SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
            return res.status(404).json({ error: 'No subscription found' });
        }
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const session = await stripe.billingPortal.sessions.create({
            customer: result.rows[0].stripe_customer_id,
            return_url: `${clientUrl}/profile`
        });
        res.json({ url: session.url });
    }
    catch (error) {
        console.error('Portal error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});
// Webhook handler
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        if (endpointSecret && sig) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        }
        else {
            event = req.body;
        }
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const { userId, planId } = session.metadata || {};
                const customer = session.customer;
                const subscription = session.subscription;
                if (userId && planId && customer && subscription) {
                    await (0, db_1.query)(`INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, 'active', to_timestamp($5), to_timestamp($6))
             ON CONFLICT (stripe_subscription_id) DO UPDATE SET
               status = 'active',
               current_period_start = to_timestamp($5),
               current_period_end = to_timestamp($6)`, [userId, customer, subscription, planId, session.created, session.expires_at || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60]);
                    await (0, db_1.query)('UPDATE users SET subscription_tier = $1 WHERE id = $2', [planId, userId]);
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    await (0, db_1.query)(`UPDATE subscriptions 
             SET status = 'active'
             WHERE stripe_subscription_id = $1`, [invoice.subscription]);
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await (0, db_1.query)(`UPDATE subscriptions 
           SET status = 'canceled', cancel_at_period_end = true
           WHERE stripe_subscription_id = $1`, [subscription.id]);
                await (0, db_1.query)(`UPDATE users SET subscription_tier = 'free'
           WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1)`, [subscription.id]);
                break;
            }
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
exports.default = router;
//# sourceMappingURL=stripe.js.map