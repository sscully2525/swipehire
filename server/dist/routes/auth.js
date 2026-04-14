"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const user_1 = require("../models/user");
const index_1 = require("../index");
const router = (0, express_1.Router)();
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
router.post('/signup', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('firstName').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('lastName').trim().isLength({ min: 1 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const existingUser = await (0, user_1.findUserByEmail)(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const user = await (0, user_1.createUser)(email, password, firstName, lastName);
        const { accessToken, refreshToken } = (0, user_1.generateTokens)(user.id);
        await (0, user_1.storeRefreshToken)(user.id, refreshToken);
        index_1.logger.info('User signed up', { userId: user.id, email });
        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                dailySwipes: user.daily_swipes,
                subscriptionTier: user.subscription_tier,
                onboardingCompleted: user.onboarding_completed
            }
        });
    }
    catch (error) {
        index_1.logger.error('Signup error', { error });
        res.status(500).json({ error: 'Failed to create account' });
    }
});
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').exists(),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await (0, user_1.findUserByEmail)(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValid = await (0, user_1.verifyPassword)(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const { accessToken, refreshToken } = (0, user_1.generateTokens)(user.id);
        await (0, user_1.storeRefreshToken)(user.id, refreshToken);
        index_1.logger.info('User logged in', { userId: user.id });
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                title: user.title,
                dailySwipes: user.daily_swipes,
                subscriptionTier: user.subscription_tier,
                onboardingCompleted: user.onboarding_completed
            }
        });
    }
    catch (error) {
        index_1.logger.error('Login error', { error });
        res.status(500).json({ error: 'Login failed' });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }
        const decoded = (0, user_1.verifyRefreshToken)(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = (0, user_1.generateTokens)(decoded.userId);
        await (0, user_1.storeRefreshToken)(decoded.userId, newRefreshToken);
        res.json({ accessToken, refreshToken: newRefreshToken });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = (0, user_1.verifyAccessToken)(token);
                await (0, user_1.invalidateRefreshToken)(decoded.userId);
            }
            catch { }
        }
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map