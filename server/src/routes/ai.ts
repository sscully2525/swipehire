import { Router, Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../models/user';
import { calculateMatchScore, getRecommendations, generateOutreachMessage } from '../services/ai';

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

router.get('/match-score/:jobId', authenticate, async (req: Request, res: Response) => {
  try {
    const score = await calculateMatchScore(req.userId!, req.params.jobId);
    res.json({ score, jobId: req.params.jobId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

router.get('/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const recommendations = await getRecommendations(req.userId!, limit);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.post('/outreach-message', authenticate, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.body;
    const message = await generateOutreachMessage(req.userId!, jobId);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

export default router;