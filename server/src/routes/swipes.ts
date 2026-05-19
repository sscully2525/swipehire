import { Router, Request, Response } from 'express';
import {
  createSwipe,
  checkForMatch,
  createMatch,
  getRemainingSwipes,
  getSwipeStats,
} from '../models/swipe';
import { findUserById, getSwipeLimit } from '../models/user';
import { calculateMatchScore } from '../services/ai';
import { authenticate } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { jobId, direction } = req.body;
    
    if (!jobId || !direction || !['left', 'right'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid swipe data' });
    }
    
    // Get user's swipe limit
    const user = await findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const dailyLimit = getSwipeLimit(user.subscription_tier);
    
    // Check remaining swipes for right swipes
    if (direction === 'right') {
      const remaining = await getRemainingSwipes(req.userId!, dailyLimit);
      if (remaining <= 0) {
        return res.status(403).json({ 
          error: 'Daily swipe limit reached',
          upgradeRequired: true,
          currentTier: user.subscription_tier,
          limit: dailyLimit
        });
      }
    }
    
    // Calculate AI match score
    const aiMatchScore = await calculateMatchScore(req.userId!, jobId);
    
    // Record the swipe
    const swipe = await createSwipe(req.userId!, jobId, direction, aiMatchScore);
    
    // Check for match on right swipe
    let match = null;
    if (direction === 'right') {
      const isMatch = await checkForMatch(req.userId!, jobId);
      if (isMatch) {
        match = await createMatch(req.userId!, jobId);
      }
    }
    
    const newRemaining = await getRemainingSwipes(req.userId!, dailyLimit);
    const stats = await getSwipeStats(req.userId!);
    
    res.json({
      swipe,
      match,
      aiMatchScore,
      remainingSwipes: newRemaining,
      stats
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Swipe error');
    res.status(500).json({ error: 'Failed to record swipe' });
  }
});

router.get('/remaining', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const dailyLimit = getSwipeLimit(user.subscription_tier);
    const remaining = await getRemainingSwipes(req.userId!, dailyLimit);
    
    res.json({ 
      remainingSwipes: remaining,
      dailyLimit,
      tier: user.subscription_tier
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get remaining swipes error');
    res.status(500).json({ error: 'Failed to get remaining swipes' });
  }
});

router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await getSwipeStats(req.userId!);
    res.json(stats);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get swipe stats error');
    res.status(500).json({ error: 'Failed to get swipe stats' });
  }
});

export default router;
