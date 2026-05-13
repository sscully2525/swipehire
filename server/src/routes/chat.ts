import { Router, Request, Response, NextFunction } from 'express';
import { getMessagesByMatch, createMessage, markMessagesAsRead } from '../models/chat';
import { getMatchById } from '../models/swipe';
import { verifyAccessToken } from '../models/user';
import { createNotification } from '../models/notification';
import { query } from '../db';
import { body, validationResult } from 'express-validator';

const router = Router();

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Resolve whether the requesting user has access to this match
// Returns { match, senderType } or throws
async function resolveMatchAccess(matchId: string, userId: string): Promise<{ match: any; senderType: 'candidate' | 'company' }> {
  const match = await getMatchById(matchId);
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });

  if (match.user_id === userId) {
    return { match, senderType: 'candidate' };
  }

  // Check if user is a recruiter who owns the startup
  const ownerCheck = await query(
    'SELECT created_by FROM startups WHERE id = $1',
    [match.startup_id]
  );
  if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].created_by === userId) {
    return { match, senderType: 'company' };
  }

  throw Object.assign(new Error('Unauthorized'), { status: 403 });
}

// POST /:matchId/messages — send a message (candidate or recruiter)
router.post('/:matchId/messages', authenticate, [
  body('content').trim().isLength({ min: 1, max: 2000 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { match, senderType } = await resolveMatchAccess(req.params.matchId, req.userId!);
    const { content } = req.body;
    const message = await createMessage(req.params.matchId, req.userId!, senderType, content);

    // Notify the other party
    const userResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [req.userId]);
    const senderName = userResult.rows.length > 0
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
      : 'Someone';

    if (senderType === 'candidate') {
      const companyOwner = await query('SELECT created_by FROM startups WHERE id = $1', [match.startup_id]);
      if (companyOwner.rows.length > 0) {
        await createNotification(companyOwner.rows[0].created_by, 'message', 'New message', `${senderName} sent you a message`, { matchId: match.id });
      }
    } else {
      await createNotification(match.user_id, 'message', 'New message', `${senderName} sent you a message`, { matchId: match.id });
    }

    res.status(201).json(message);
  } catch (err: any) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /:matchId/messages — list messages (candidate or recruiter)
router.get('/:matchId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { match, senderType } = await resolveMatchAccess(req.params.matchId, req.userId!);

    // If a match has been closed/unmatched, surface that to the client so
    // it can show "Conversation ended" rather than a blank chat. Still
    // return historical messages — they shouldn't disappear retroactively.
    const matchClosed = match.status === 'unmatched' || match.status === 'closed';

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const messages = await getMessagesByMatch(req.params.matchId, limit, offset);

    // Only mark as read for ACTIVE matches. We don't want to silently
    // mark history as read on an unmatched conversation.
    if (!matchClosed) {
      const otherSide = senderType === 'candidate' ? 'company' : 'candidate';
      await markMessagesAsRead(req.params.matchId, otherSide);
    }

    // Preserve backwards compatibility (existing clients expect an array)
    // while still surfacing match status via response headers.
    res.setHeader('X-Match-Status', match.status || 'active');
    if (matchClosed) res.setHeader('X-Match-Closed', '1');
    res.json(messages);
  } catch (err: any) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
