"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// Recruiter/Company Registration
router.post('/recruiter/signup', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
    (0, express_validator_1.body)('firstName').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('lastName').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('companyName').trim().isLength({ min: 1 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, password, firstName, lastName, companyName } = req.body;
        const existingUser = await (0, user_1.findUserByEmail)(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        // Create user with recruiter role
        const user = await (0, user_1.createUser)(email, password, firstName, lastName, 'recruiter');
        // Create company
        const { query } = await Promise.resolve().then(() => __importStar(require('../db')));
        const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
        const startupId = uuidv4();
        await query(`INSERT INTO startups (id, name, slug, description, stage, created_by, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [startupId, companyName, companyName.toLowerCase().replace(/\s+/g, '-'), `${companyName} - A growing company`, 'Seed', user.id, false]);
        const { accessToken, refreshToken } = (0, user_1.generateTokens)(user.id);
        await (0, user_1.storeRefreshToken)(user.id, refreshToken);
        index_1.logger.info('Recruiter signed up', { userId: user.id, email, companyId: startupId });
        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: 'recruiter',
                companyId: startupId
            }
        });
    }
    catch (error) {
        index_1.logger.error('Recruiter signup error', { error });
        res.status(500).json({ error: 'Failed to create recruiter account' });
    }
});
// Get current user info
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, user_1.verifyAccessToken)(token);
        const user = await (0, user_1.findUserByEmail)(decoded.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            title: user.title,
            dailySwipes: user.daily_swipes,
            subscriptionTier: user.subscription_tier,
            onboardingCompleted: user.onboarding_completed
        });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map