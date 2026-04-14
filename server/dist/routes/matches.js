"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const swipe_1 = require("../models/swipe");
const chat_1 = require("../models/chat");
const user_1 = require("../models/user");
const express_validator_1 = require("express-validator");
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
router.get('/', authenticate, async (req, res) => {
    try {
        const matches = await (0, swipe_1.getUserMatches)(req.userId);
        res.json(matches);
    }
    catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});
router.get('/:id', authenticate, async (req, res) => {
    try {
        const match = await (0, swipe_1.getMatchById)(req.params.id);
        if (!match || match.user_id !== req.userId) {
            return res.status(404).json({ error: 'Match not found' });
        }
        // Get recent messages
        const messages = await (0, chat_1.getMessagesByMatch)(req.params.id, 20);
        res.json({ ...match, messages });
    }
    catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ error: 'Failed to fetch match' });
    }
});
router.get('/:id/messages', authenticate, async (req, res) => {
    try {
        const match = await (0, swipe_1.getMatchById)(req.params.id);
        if (!match || match.user_id !== req.userId) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const messages = await (0, chat_1.getMessagesByMatch)(req.params.id, limit, offset);
        // Mark messages as read
        await (0, chat_1.markMessagesAsRead)(req.params.id, 'company');
        res.json(messages);
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
router.put('/:id/status', authenticate, [
    (0, express_validator_1.body)('status').isIn(['pending', 'contacted', 'interview_scheduled', 'hired', 'rejected']),
], async (req, res) => {
    try {
        const match = await (0, swipe_1.getMatchById)(req.params.id);
        if (!match || match.user_id !== req.userId) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const { status, scheduledCallAt, callLink, notes } = req.body;
        await (0, swipe_1.updateMatchStatus)(req.params.id, status, {
            scheduledCallAt,
            callLink,
            notes
        });
        res.json({ message: 'Status updated successfully' });
    }
    catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
exports.default = router;
//# sourceMappingURL=matches.js.map