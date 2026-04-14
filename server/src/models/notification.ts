import { query } from '../db';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  read_at?: Date;
  created_at: Date;
}

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
): Promise<Notification> => {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, message, data ? JSON.stringify(data) : null]
  );
  return result.rows[0];
};

export const getUserNotifications = async (userId: string, limit: number = 20): Promise<Notification[]> => {
  const result = await query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await query(
    `UPDATE notifications 
     SET read = true, read_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [notificationId]
  );
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  await query(
    `UPDATE notifications 
     SET read = true, read_at = CURRENT_TIMESTAMP 
     WHERE user_id = $1 AND read = false`,
    [userId]
  );
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const result = await query(
    `SELECT COUNT(*) as count FROM notifications 
     WHERE user_id = $1 AND read = false`,
    [userId]
  );
  return parseInt(result.rows[0].count);
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
};