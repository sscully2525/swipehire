"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
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
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        // Get user's swipe stats
        const swipeStats = await (0, db_1.query)(`SELECT 
        COUNT(*) FILTER (WHERE direction = 'right') as total_right_swipes,
        COUNT(*) FILTER (WHERE direction = 'left') as total_left_swipes,
        COUNT(*) FILTER (WHERE direction = 'right' AND created_at > CURRENT_DATE) as today_swipes,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as last_7_days_swipes
      FROM swipes WHERE user_id = $1`, [req.userId]);
        // Get match stats
        const matchStats = await (0, db_1.query)(`SELECT 
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_matches,
        COUNT(*) FILTER (WHERE status = 'interview_scheduled') as scheduled_interviews
      FROM matches WHERE user_id = $1`, [req.userId]);
        // Get top matching companies
        const topMatches = await (0, db_1.query)(`SELECT s.name, s.stage, m.created_at
       FROM matches m
       JOIN startups s ON m.startup_id = s.id
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC
       LIMIT 5`, [req.userId]);
        // Get skill match distribution
        const skillMatches = await (0, db_1.query)(`SELECT unnest(j.tech_stack) as skill, COUNT(*) as count
       FROM swipes sw
       JOIN jobs j ON sw.job_id = j.id
       WHERE sw.user_id = $1 AND sw.direction = 'right'
       GROUP BY skill
       ORDER BY count DESC
       LIMIT 5`, [req.userId]);
        res.json({
            swipes: swipeStats.rows[0],
            matches: matchStats.rows[0],
            topMatches: topMatches.rows,
            skillMatches: skillMatches.rows
        });
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
router.get('/recommendations', authenticate, async (req, res) => {
    try {
        const recommendations = await (0, ai_1.getRecommendations)(req.userId, 5);
        res.json(recommendations);
    }
    catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map