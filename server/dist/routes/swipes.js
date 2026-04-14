"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const swipe_1 = require("../models/swipe");
const user_1 = require("../models/user");
const ai_1 = require("../services/ai");
const user_2 = require("../models/user");
const router = (0, express_1.Router)();
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
router.post('/', authenticate, async (req, res) => {
    try {
        const { jobId, direction } = req.body;
        if (!jobId || !direction || !['left', 'right'].includes(direction)) {
            return res.status(400).json({ error: 'Invalid swipe data' });
        }
        // Get user's swipe limit
        const user = await (0, user_1.findUserById)(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const dailyLimit = (0, user_1.getSwipeLimit)(user.subscription_tier);
        // Check remaining swipes for right swipes
        if (direction === 'right') {
            const remaining = await (0, swipe_1.getRemainingSwipes)(req.userId, dailyLimit);
            if (remaining <= 0) {
                return res.status(403).json({
                    error: 'Daily swipe limit reached',
                    upgradeRequired: true,
                    currentTier: user.subscription_tier,
                    limit: dailyLimit
                });
            }
        }
        // Calculate AI match score
        const aiMatchScore = await (0, ai_1.calculateMatchScore)(req.userId, jobId);
        // Record the swipe
        const swipe = await (0, swipe_1.createSwipe)(req.userId, jobId, direction, aiMatchScore);
        // Check for match on right swipe
        let match = null;
        if (direction === 'right') {
            const isMatch = await (0, swipe_1.checkForMatch)(req.userId, jobId);
            if (isMatch) {
                match = await (0, swipe_1.createMatch)(req.userId, jobId);
            }
        }
        const newRemaining = await (0, swipe_1.getRemainingSwipes)(req.userId, dailyLimit);
        const stats = await (0, swipe_1.getSwipeStats)(req.userId);
        res.json({
            swipe,
            match,
            aiMatchScore,
            remainingSwipes: newRemaining,
            stats
        });
    }
    catch (error) {
        console.error('Swipe error:', error);
        res.status(500).json({ error: 'Failed to record swipe' });
    }
});
router.get('/remaining', authenticate, async (req, res) => {
    try {
        const user = await (0, user_1.findUserById)(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const dailyLimit = (0, user_1.getSwipeLimit)(user.subscription_tier);
        const remaining = await (0, swipe_1.getRemainingSwipes)(req.userId, dailyLimit);
        res.json({
            remainingSwipes: remaining,
            dailyLimit,
            tier: user.subscription_tier
        });
    }
    catch (error) {
        console.error('Get remaining swipes error:', error);
        res.status(500).json({ error: 'Failed to get remaining swipes' });
    }
});
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = await (0, swipe_1.getSwipeStats)(req.userId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get swipe stats' });
    }
});
exports.default = router;
//# sourceMappingURL=swipes.js.map