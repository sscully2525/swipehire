import { Router, Request, Response } from 'express';
import { getUserMatches, getMatchById, updateMatchStatus } from '../models/swipe';
import { getMessagesByMatch, markMessagesAsRead } from '../models/chat';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const matches = await getUserMatches(req.userId!);
    res.json(matches);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get matches error');
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const match = await getMatchById(req.params.id);

    if (!match || match.user_id !== req.userId!) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Get recent messages
    const messages = await getMessagesByMatch(req.params.id, 20);

    res.json({ ...match, messages });
  } catch (error) {
    logger.error({ err: error, userId: req.userId, matchId: req.params.id }, 'Get match error');
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

router.get('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const match = await getMatchById(req.params.id);

    if (!match || match.user_id !== req.userId!) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await getMessagesByMatch(req.params.id, limit, offset);

    // Mark messages as read
    await markMessagesAsRead(req.params.id, 'company');

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.put('/:id/status', authenticate, [
  body('status').isIn(['pending', 'contacted', 'interview_scheduled', 'hired', 'rejected']),
], async (req: Request, res: Response) => {
  try {
    const match = await getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const isCandidate = match.user_id === req.userId!;
    if (!isCandidate) {
      // Check if recruiter owns the company
      const { query: dbQuery } = await import('../db');
      const ownerCheck = await dbQuery('SELECT created_by FROM startups WHERE id = $1', [match.startup_id]);
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].created_by !== req.userId!) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const { status, scheduledCallAt, callLink, notes } = req.body;
    await updateMatchStatus(req.params.id, status, { scheduledCallAt, callLink, notes });
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId, matchId: req.params.id }, 'Update match status error');
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Unmatch — remove match for both sides and notify the recruiter user.
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { query } = await import('../db');
    const match = await getMatchById(req.params.id);

    if (!match || match.user_id !== req.userId!) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Look up the recruiter's user id from the startup. Previously this
    // route inserted `match.startup_id` into `notifications.user_id`,
    // which violates the FK (and is just plain wrong — startup_id is a
    // startup row, not a user). (audit 🔴)
    const recruiterRow = await query(
      'SELECT created_by FROM startups WHERE id = $1',
      [match.startup_id]
    );
    const recruiterUserId: string | null = recruiterRow.rows[0]?.created_by || null;

    if (recruiterUserId) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'match_removed', 'Match Removed', $2, $3)`,
        [
          recruiterUserId,
          'A candidate has unmatched with your company',
          JSON.stringify({ matchId: req.params.id, jobId: match.job_id }),
        ]
      );
    }

    // Delete the match
    await query('DELETE FROM matches WHERE id = $1', [req.params.id]);

    res.json({ message: 'Match removed successfully' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId, matchId: req.params.id }, 'Unmatch error');
    res.status(500).json({ error: 'Failed to remove match' });
  }
});

export default router;
