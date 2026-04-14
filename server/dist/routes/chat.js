"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_1 = require("../models/chat");
const swipe_1 = require("../models/swipe");
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
router.post('/:matchId/messages', authenticate, [
    (0, express_validator_1.body)('content').trim().isLength({ min: 1, max: 2000 }),
], async (req, res) => {
    try {
        const match = await (0, swipe_1.getMatchById)(req.params.matchId);
        if (!match || match.user_id !== req.userId) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const { content } = req.body;
        const message = await (0, chat_1.createMessage)(req.params.matchId, req.userId, 'candidate', content);
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map