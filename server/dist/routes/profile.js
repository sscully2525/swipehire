"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../models/user");
const express_validator_1 = require("express-validator");
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
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await (0, user_1.findUserById)(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
router.put('/', authenticate, [
    (0, express_validator_1.body)('title').optional().trim(),
    (0, express_validator_1.body)('bio').optional().trim(),
    (0, express_validator_1.body)('skills').optional().isArray(),
    (0, express_validator_1.body)('linkedinUrl').optional().isURL(),
    (0, express_validator_1.body)('githubUrl').optional().isURL(),
    (0, express_validator_1.body)('portfolioUrl').optional().isURL(),
    (0, express_validator_1.body)('yearsExperience').optional().isInt({ min: 0, max: 50 }),
    (0, express_validator_1.body)('preferredSalaryMin').optional().isInt(),
    (0, express_validator_1.body)('preferredSalaryMax').optional().isInt(),
    (0, express_validator_1.body)('remotePreference').optional().isIn(['remote', 'onsite', 'hybrid']),
], async (req, res) => {
    try {
        const updates = {};
        if (req.body.title !== undefined)
            updates.title = req.body.title;
        if (req.body.bio !== undefined)
            updates.bio = req.body.bio;
        if (req.body.skills !== undefined)
            updates.skills = req.body.skills;
        if (req.body.linkedinUrl !== undefined)
            updates.linkedin_url = req.body.linkedinUrl;
        if (req.body.githubUrl !== undefined)
            updates.github_url = req.body.githubUrl;
        if (req.body.portfolioUrl !== undefined)
            updates.portfolio_url = req.body.portfolioUrl;
        if (req.body.yearsExperience !== undefined)
            updates.years_experience = req.body.yearsExperience;
        if (req.body.preferredSalaryMin !== undefined)
            updates.preferred_salary_min = req.body.preferredSalaryMin;
        if (req.body.preferredSalaryMax !== undefined)
            updates.preferred_salary_max = req.body.preferredSalaryMax;
        if (req.body.remotePreference !== undefined)
            updates.remote_preference = req.body.remotePreference;
        if (req.body.location !== undefined)
            updates.location = req.body.location;
        if (req.body.onboardingCompleted !== undefined)
            updates.onboarding_completed = req.body.onboardingCompleted;
        const user = await (0, user_1.updateUser)(req.userId, updates);
        res.json(user);
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
router.post('/complete-onboarding', authenticate, async (req, res) => {
    try {
        const user = await (0, user_1.updateUser)(req.userId, { onboarding_completed: true });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});
exports.default = router;
//# sourceMappingURL=profile.js.map