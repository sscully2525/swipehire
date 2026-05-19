import { Router, Request, Response } from 'express';
import { query } from '../db';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../models/notification';
import { authenticate } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await getUserNotifications(req.userId!, limit);
    res.json(notifications);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get notifications error');
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const count = await getUnreadNotificationCount(req.userId!);
    res.json({ count });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get unread count error');
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

router.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    // Ownership check: only the owning user may mark a notification as read.
    // (Previously this was an IDOR — any authenticated user could mark any
    // notification.) Returns 404 if the notification doesn't exist OR isn't
    // theirs, to avoid leaking existence.
    const result = await query(
      `UPDATE notifications
          SET read = true, read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id`,
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    logger.error({ err, userId: req.userId, notificationId: req.params.id }, 'Mark notification read error');
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.put('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await markAllNotificationsAsRead(req.userId!);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Mark all notifications read error');
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
