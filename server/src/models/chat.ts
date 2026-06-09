import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string | null; // null for system messages
  sender_type: 'candidate' | 'company';
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  read_at?: Date;
  created_at: Date;
}

export const createMessage = async (
  matchId: string,
  senderId: string,
  senderType: 'candidate' | 'company',
  content: string,
  messageType: 'text' | 'image' | 'file' | 'system' = 'text',
  fileUrl?: string
): Promise<ChatMessage> => {
  const id = uuidv4();
  
  const result = await query(
    `INSERT INTO chat_messages (id, match_id, sender_id, sender_type, content, message_type, file_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, matchId, senderId, senderType, content, messageType, fileUrl]
  );
  
  return result.rows[0];
};

export const getMessagesByMatch = async (matchId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
  const result = await query(
    `SELECT * FROM chat_messages 
     WHERE match_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [matchId, limit, offset]
  );
  return result.rows.reverse(); // Return in chronological order
};

export const markMessagesAsRead = async (matchId: string, senderType: 'candidate' | 'company'): Promise<void> => {
  await query(
    `UPDATE chat_messages 
     SET read_at = CURRENT_TIMESTAMP 
     WHERE match_id = $1 AND sender_type = $2 AND read_at IS NULL`,
    [matchId, senderType]
  );
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const result = await query(
    `SELECT COUNT(*) as count 
     FROM chat_messages cm
     JOIN matches m ON cm.match_id = m.id
     WHERE m.user_id = $1 
       AND cm.sender_type = 'company' 
       AND cm.read_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0].count);
};

export const createSystemMessage = async (matchId: string, content: string): Promise<ChatMessage> => {
  // System messages have no human sender. sender_id is a nullable UUID FK to
  // users(id) — passing the literal string 'system' (as this used to) makes
  // Postgres reject the row with an invalid-UUID error.
  const result = await query(
    `INSERT INTO chat_messages (id, match_id, sender_id, sender_type, content, message_type)
     VALUES ($1, $2, NULL, 'company', $3, 'system')
     RETURNING *`,
    [uuidv4(), matchId, content]
  );
  return result.rows[0];
};