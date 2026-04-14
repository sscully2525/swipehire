"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../models/user");
const ai_1 = require("../services/ai");
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
router.get('/match-score/:jobId', authenticate, async (req, res) => {
    try {
        const score = await (0, ai_1.calculateMatchScore)(req.userId, req.params.jobId);
        res.json({ score, jobId: req.params.jobId });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to calculate match score' });
    }
});
router.get('/recommendations', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const recommendations = await (0, ai_1.getRecommendations)(req.userId, limit);
        res.json(recommendations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});
router.post('/outreach-message', authenticate, async (req, res) => {
    try {
        const { jobId } = req.body;
        const message = await (0, ai_1.generateOutreachMessage)(req.userId, jobId);
        res.json({ message });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate message' });
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map