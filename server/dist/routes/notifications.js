"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../models/user");
const notification_1 = require("../models/notification");
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
        const limit = parseInt(req.query.limit) || 20;
        const notifications = await (0, notification_1.getUserNotifications)(req.userId, limit);
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const count = await (0, notification_1.getUnreadNotificationCount)(req.userId);
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        await (0, notification_1.markNotificationAsRead)(req.params.id);
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});
router.put('/read-all', authenticate, async (req, res) => {
    try {
        await (0, notification_1.markAllNotificationsAsRead)(req.userId);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map