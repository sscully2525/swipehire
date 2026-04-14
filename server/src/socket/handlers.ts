import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createMessage, markMessagesAsRead, getMessagesByMatch } from '../models/chat';
import { getMatchById } from '../models/swipe';
import { updateLastActive } from '../models/user';
import { createNotification } from '../models/notification';
import { redis } from '../index';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.userId = decoded.userId;
      
      // Store socket mapping in Redis
      await redis.setEx(`socket:${socket.userId}`, 3600, socket.id);
      
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Join user's room for notifications
    socket.join(`user:${socket.userId}`);
    
    // Update last active
    if (socket.userId) {
      updateLastActive(socket.userId);
    }

    // Join match rooms
    socket.on('join_match', async (matchId: string) => {
      try {
        const match = await getMatchById(matchId);
        if (!match || match.user_id !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }
        
        socket.join(`match:${matchId}`);
        socket.emit('joined_match', { matchId });
        
        // Mark messages as read
        await markMessagesAsRead(matchId, 'company');
      } catch (err) {
        socket.emit('error', { message: 'Failed to join match' });
      }
    });

    // Leave match room
    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    // Send message
    socket.on('send_message', async (data: { matchId: string; content: string }) => {
      try {
        const { matchId, content } = data;
        
        const match = await getMatchById(matchId);
        if (!match || match.user_id !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }
        
        // Create message
        const message = await createMessage(matchId, socket.userId!, 'candidate', content);
        
        // Broadcast to match room
        io.to(`match:${matchId}`).emit('new_message', {
          ...message,
          sender_name: `${match.user_first_name} ${match.user_last_name}`
        });
        
        // Notify company (in production, this would notify the actual company user)
        // For now, we just log it
        console.log(`Message sent in match ${matchId}`);
        
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data: { matchId: string; isTyping: boolean }) => {
      socket.to(`match:${data.matchId}`).emit('typing', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });

    // Load more messages
    socket.on('load_messages', async (data: { matchId: string; page: number }) => {
      try {
        const { matchId, page } = data;
        const limit = 20;
        const offset = (page - 1) * limit;
        
        const messages = await getMessagesByMatch(matchId, limit, offset);
        socket.emit('messages_loaded', { messages, page });
      } catch (err) {
        socket.emit('error', { message: 'Failed to load messages' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.userId} disconnected`);
      if (socket.userId) {
        await redis.del(`socket:${socket.userId}`);
      }
    });
  });
};

// Helper to send notification to user
export const sendNotificationToUser = async (io: Server, userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', notification);
};