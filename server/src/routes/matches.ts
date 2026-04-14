import { Router, Request, Response, NextFunction } from 'express';
import { getUserMatches, getMatchById, updateMatchStatus } from '../models/swipe';
import { getMessagesByMatch, markMessagesAsRead } from '../models/chat';
import { verifyAccessToken } from '../models/user';
import { body } from 'express-validator';

const router = Router();

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const matches = await getUserMatches(req.userId!);
    res.json(matches);
  } catch (error) {
    console.error('Get matches error:', error);
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
    console.error('Get match error:', error);
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
    
    if (!match || match.user_id !== req.userId!) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const { status, scheduledCallAt, callLink, notes } = req.body;
    
    await updateMatchStatus(req.params.id, status, {
      scheduledCallAt,
      callLink,
      notes
    });
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;