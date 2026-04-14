"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
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
// Check if user is admin
const requireAdmin = async (req, res, next) => {
    // In production, check admin role from JWT or database
    // For now, allow all authenticated users to see admin stats
    next();
};
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
    try {
        // Platform stats
        const userStats = await (0, db_1.query)(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_users_last_7_days,
        COUNT(*) FILTER (WHERE last_active_at > CURRENT_DATE - INTERVAL '1 day') as daily_active_users
      FROM users
    `);
        const swipeStats = await (0, db_1.query)(`
      SELECT 
        COUNT(*) as total_swipes,
        COUNT(*) FILTER (WHERE direction = 'right') as right_swipes,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as swipes_today
      FROM swipes
    `);
        const matchStats = await (0, db_1.query)(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE status = 'interview_scheduled') as scheduled_interviews
      FROM matches
    `);
        const startupStats = await (0, db_1.query)(`
      SELECT 
        COUNT(*) as total_startups,
        COUNT(*) FILTER (WHERE verified = true) as verified_startups
      FROM startups
    `);
        res.json({
            users: userStats.rows[0],
            swipes: swipeStats.rows[0],
            matches: matchStats.rows[0],
            startups: startupStats.rows[0]
        });
    }
    catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});
router.get('/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = await (0, db_1.query)(`
      SELECT id, email, first_name, last_name, title, subscription_tier, 
             created_at, last_active_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map