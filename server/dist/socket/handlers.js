"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToUser = exports.initSocketHandlers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const chat_1 = require("../models/chat");
const swipe_1 = require("../models/swipe");
const user_1 = require("../models/user");
const index_1 = require("../index");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const initSocketHandlers = (io) => {
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            // Store socket mapping in Redis
            await index_1.redis.setEx(`socket:${socket.userId}`, 3600, socket.id);
            next();
        }
        catch (err) {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`User ${socket.userId} connected`);
        // Join user's room for notifications
        socket.join(`user:${socket.userId}`);
        // Update last active
        if (socket.userId) {
            (0, user_1.updateLastActive)(socket.userId);
        }
        // Join match rooms
        socket.on('join_match', async (matchId) => {
            try {
                const match = await (0, swipe_1.getMatchById)(matchId);
                if (!match || match.user_id !== socket.userId) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }
                socket.join(`match:${matchId}`);
                socket.emit('joined_match', { matchId });
                // Mark messages as read
                await (0, chat_1.markMessagesAsRead)(matchId, 'company');
            }
            catch (err) {
                socket.emit('error', { message: 'Failed to join match' });
            }
        });
        // Leave match room
        socket.on('leave_match', (matchId) => {
            socket.leave(`match:${matchId}`);
        });
        // Send message
        socket.on('send_message', async (data) => {
            try {
                const { matchId, content } = data;
                const match = await (0, swipe_1.getMatchById)(matchId);
                if (!match || match.user_id !== socket.userId) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }
                // Create message
                const message = await (0, chat_1.createMessage)(matchId, socket.userId, 'candidate', content);
                // Broadcast to match room
                io.to(`match:${matchId}`).emit('new_message', {
                    ...message,
                    sender_name: `${match.user_first_name} ${match.user_last_name}`
                });
                // Notify company (in production, this would notify the actual company user)
                // For now, we just log it
                console.log(`Message sent in match ${matchId}`);
            }
            catch (err) {
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // Typing indicator
        socket.on('typing', (data) => {
            socket.to(`match:${data.matchId}`).emit('typing', {
                userId: socket.userId,
                isTyping: data.isTyping
            });
        });
        // Load more messages
        socket.on('load_messages', async (data) => {
            try {
                const { matchId, page } = data;
                const limit = 20;
                const offset = (page - 1) * limit;
                const messages = await (0, chat_1.getMessagesByMatch)(matchId, limit, offset);
                socket.emit('messages_loaded', { messages, page });
            }
            catch (err) {
                socket.emit('error', { message: 'Failed to load messages' });
            }
        });
        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log(`User ${socket.userId} disconnected`);
            if (socket.userId) {
                await index_1.redis.del(`socket:${socket.userId}`);
            }
        });
    });
};
exports.initSocketHandlers = initSocketHandlers;
// Helper to send notification to user
const sendNotificationToUser = async (io, userId, notification) => {
    io.to(`user:${userId}`).emit('notification', notification);
};
exports.sendNotificationToUser = sendNotificationToUser;
//# sourceMappingURL=handlers.js.map