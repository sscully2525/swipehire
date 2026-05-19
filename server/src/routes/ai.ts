import { Router, Request, Response } from 'express';
import { calculateMatchScore, getRecommendations, generateOutreachMessage } from '../services/ai';
import { logger } from '../logger';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/match-score/:jobId', authenticate, async (req: Request, res: Response) => {
  try {
    const score = await calculateMatchScore(req.userId!, req.params.jobId);
    res.json({ score, jobId: req.params.jobId });
  } catch (err) {
    logger.error({ err, userId: req.userId, jobId: req.params.jobId }, 'Calculate match score error');
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

router.get('/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const recommendations = await getRecommendations(req.userId!, limit);
    res.json(recommendations);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get AI recommendations error');
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.post('/outreach-message', authenticate, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.body;
    const message = await generateOutreachMessage(req.userId!, jobId);
    res.json({ message });
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Generate outreach message error');
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

export default router;