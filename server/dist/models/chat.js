"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemMessage = exports.getUnreadCount = exports.markMessagesAsRead = exports.getMessagesByMatch = exports.createMessage = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
const createMessage = async (matchId, senderId, senderType, content, messageType = 'text', fileUrl) => {
    const id = (0, uuid_1.v4)();
    const result = await (0, db_1.query)(`INSERT INTO chat_messages (id, match_id, sender_id, sender_type, content, message_type, file_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`, [id, matchId, senderId, senderType, content, messageType, fileUrl]);
    return result.rows[0];
};
exports.createMessage = createMessage;
const getMessagesByMatch = async (matchId, limit = 50, offset = 0) => {
    const result = await (0, db_1.query)(`SELECT * FROM chat_messages 
     WHERE match_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`, [matchId, limit, offset]);
    return result.rows.reverse(); // Return in chronological order
};
exports.getMessagesByMatch = getMessagesByMatch;
const markMessagesAsRead = async (matchId, senderType) => {
    await (0, db_1.query)(`UPDATE chat_messages 
     SET read_at = CURRENT_TIMESTAMP 
     WHERE match_id = $1 AND sender_type = $2 AND read_at IS NULL`, [matchId, senderType]);
};
exports.markMessagesAsRead = markMessagesAsRead;
const getUnreadCount = async (userId) => {
    const result = await (0, db_1.query)(`SELECT COUNT(*) as count 
     FROM chat_messages cm
     JOIN matches m ON cm.match_id = m.id
     WHERE m.user_id = $1 
       AND cm.sender_type = 'company' 
       AND cm.read_at IS NULL`, [userId]);
    return parseInt(result.rows[0].count);
};
exports.getUnreadCount = getUnreadCount;
const createSystemMessage = async (matchId, content) => {
    return (0, exports.createMessage)(matchId, 'system', 'company', content, 'system');
};
exports.createSystemMessage = createSystemMessage;
//# sourceMappingURL=chat.js.map