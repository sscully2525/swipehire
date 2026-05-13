import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createMessage, markMessagesAsRead, getMessagesByMatch } from '../models/chat';
import { getMatchById } from '../models/swipe';
import { updateLastActive } from '../models/user';
import { redis } from '../index';
import { query } from '../db';

// Match the env-required pattern used by `models/user.ts` (production
// bootstrap in `index.ts` refuses to start without a strong JWT_SECRET).
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

export const initSocketHandlers = (io: Server) => {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.userId = decoded.userId;

      // Load role and name from DB
      const userResult = await query(
        'SELECT role, first_name, last_name FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (userResult.rows.length > 0) {
        socket.userRole = userResult.rows[0].role;
        socket.userName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
      }

      await redis.setEx(`socket:${socket.userId}`, 3600, socket.id);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.join(`user:${socket.userId}`);

    if (socket.userId) {
      updateLastActive(socket.userId).catch(() => {});
    }

    // Candidates join match rooms
    socket.on('join_match', async (matchId: string) => {
      try {
        const match = await getMatchById(matchId);
        if (!match) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        const isCandidate = match.user_id === socket.userId;
        const isRecruiter = socket.userRole === 'recruiter' || socket.userRole === 'admin';

        // Verify access: candidate owns match, or recruiter owns the company
        if (!isCandidate && !isRecruiter) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        if (isRecruiter && !isCandidate) {
          // Verify recruiter owns the company linked to this match
          const ownerCheck = await query(
            'SELECT id FROM startups WHERE id = $1 AND created_by = $2',
            [match.startup_id, socket.userId]
          );
          if (ownerCheck.rows.length === 0) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }
        }

        socket.join(`match:${matchId}`);
        socket.emit('joined_match', { matchId });

        // Mark other side's messages as read
        const senderType = isCandidate ? 'company' : 'candidate';
        await markMessagesAsRead(matchId, senderType);
      } catch (err) {
        socket.emit('error', { message: 'Failed to join match' });
      }
    });

    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    // Send message — candidates send as 'candidate', recruiters send as 'company'
    socket.on('send_message', async (data: { matchId: string; content: string }) => {
      try {
        const { matchId, content } = data;

        const match = await getMatchById(matchId);
        if (!match) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        const isCandidate = match.user_id === socket.userId;
        const isRecruiter = socket.userRole === 'recruiter' || socket.userRole === 'admin';

        if (!isCandidate && !isRecruiter) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const senderType = isCandidate ? 'candidate' : 'company';
        const message = await createMessage(matchId, socket.userId!, senderType, content);

        io.to(`match:${matchId}`).emit('new_message', {
          ...message,
          sender_name: socket.userName
        });

        // Notify the other party
        if (senderType === 'candidate') {
          // Notify recruiter: find company owner
          const companyOwner = await query(
            'SELECT created_by FROM startups WHERE id = $1',
            [match.startup_id]
          );
          if (companyOwner.rows.length > 0) {
            const recruiterId = companyOwner.rows[0].created_by;
            const notif = await createNotification(
              recruiterId,
              'message',
              'New message',
              `${socket.userName} sent you a message`,
              { matchId, jobId: match.job_id }
            );
            io.to(`user:${recruiterId}`).emit('notification', notif);
          }
        } else {
          // Notify candidate
          const notif = await createNotification(
            match.user_id,
            'message',
            'New message',
            `${socket.userName} sent you a message`,
            { matchId, jobId: match.job_id }
          );
          io.to(`user:${match.user_id}`).emit('notification', notif);
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data: { matchId: string; isTyping: boolean }) => {
      socket.to(`match:${data.matchId}`).emit('typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: data.isTyping
      });
    });

    socket.on('load_messages', async (data: { matchId: string; page: number }) => {
      try {
        const { matchId, page } = data;
        const limit = 20;
        const offset = (page - 1) * limit;
        const messages = await getMessagesByMatch(matchId, limit, offset);
        socket.emit('messages_loaded', { messages, page });
      } catch {
        socket.emit('error', { message: 'Failed to load messages' });
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        await redis.del(`socket:${socket.userId}`);
      }
    });
  });
};

export const sendNotificationToUser = async (io: Server, userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', notification);
};
