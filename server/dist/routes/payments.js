"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../models/user");
const router = (0, express_1.Router)();
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = (0, user_1.verifyAccessToken)(token);
        req.userId = decoded.userId;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// Mock payment endpoints (integrate with Stripe in production)
router.get('/subscription', authenticate, async (req, res) => {
    try {
        // Return current subscription status
        res.json({
            tier: 'free',
            status: 'active',
            features: {
                dailySwipes: 10,
                seeWhoLikedYou: false,
                priorityMatching: false,
                advancedFilters: false
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});
router.get('/plans', async (req, res) => {
    try {
        res.json([
            {
                id: 'free',
                name: 'Free',
                price: 0,
                features: [
                    '10 swipes per day',
                    'Basic matching',
                    'Profile creation'
                ]
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 19.99,
                period: 'month',
                features: [
                    '50 swipes per day',
                    'See who liked you',
                    'Advanced filters',
                    'Priority matching',
                    'Read receipts'
                ]
            },
            {
                id: 'unlimited',
                name: 'Unlimited',
                price: 39.99,
                period: 'month',
                features: [
                    'Unlimited swipes',
                    'See who liked you',
                    'Advanced filters',
                    'Priority matching',
                    'Read receipts',
                    'Profile boost',
                    'AI career coach'
                ]
            }
        ]);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { planId } = req.body;
        // In production, create Stripe checkout session
        res.json({
            message: 'Subscription initiated',
            planId,
            checkoutUrl: 'https://stripe.com/checkout/mock'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map