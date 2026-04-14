"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.getUnreadNotificationCount = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = exports.createNotification = void 0;
const db_1 = require("../db");
const createNotification = async (userId, type, title, message, data) => {
    const result = await (0, db_1.query)(`INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [userId, type, title, message, data ? JSON.stringify(data) : null]);
    return result.rows[0];
};
exports.createNotification = createNotification;
const getUserNotifications = async (userId, limit = 20) => {
    const result = await (0, db_1.query)(`SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`, [userId, limit]);
    return result.rows;
};
exports.getUserNotifications = getUserNotifications;
const markNotificationAsRead = async (notificationId) => {
    await (0, db_1.query)(`UPDATE notifications 
     SET read = true, read_at = CURRENT_TIMESTAMP 
     WHERE id = $1`, [notificationId]);
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (userId) => {
    await (0, db_1.query)(`UPDATE notifications 
     SET read = true, read_at = CURRENT_TIMESTAMP 
     WHERE user_id = $1 AND read = false`, [userId]);
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
const getUnreadNotificationCount = async (userId) => {
    const result = await (0, db_1.query)(`SELECT COUNT(*) as count FROM notifications 
     WHERE user_id = $1 AND read = false`, [userId]);
    return parseInt(result.rows[0].count);
};
exports.getUnreadNotificationCount = getUnreadNotificationCount;
const deleteNotification = async (notificationId, userId) => {
    await (0, db_1.query)(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
};
exports.deleteNotification = deleteNotification;
//# sourceMappingURL=notification.js.map