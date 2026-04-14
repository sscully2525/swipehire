import { Router, Request, Response, NextFunction } from 'express';
import { getMessagesByMatch, createMessage } from '../models/chat';
import { getMatchById } from '../models/swipe';
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

router.post('/:matchId/messages', authenticate, [
  body('content').trim().isLength({ min: 1, max: 2000 }),
], async (req: Request, res: Response) => {
  try {
    const match = await getMatchById(req.params.matchId);
    
    if (!match || match.user_id !== req.userId!) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const { content } = req.body;
    const message = await createMessage(req.params.matchId, req.userId!, 'candidate', content);
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;