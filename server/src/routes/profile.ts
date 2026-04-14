import { Router, Request, Response, NextFunction } from 'express';
import { findUserById, updateUser } from '../models/user';
import { body } from 'express-validator';
import { verifyAccessToken } from '../models/user';

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
    const user = await findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', authenticate, [
  body('title').optional().trim(),
  body('bio').optional().trim(),
  body('skills').optional().isArray(),
  body('linkedinUrl').optional().isURL(),
  body('githubUrl').optional().isURL(),
  body('portfolioUrl').optional().isURL(),
  body('yearsExperience').optional().isInt({ min: 0, max: 50 }),
  body('preferredSalaryMin').optional().isInt(),
  body('preferredSalaryMax').optional().isInt(),
  body('remotePreference').optional().isIn(['remote', 'onsite', 'hybrid']),
], async (req: Request, res: Response) => {
  try {
    const updates: any = {};
    
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.skills !== undefined) updates.skills = req.body.skills;
    if (req.body.linkedinUrl !== undefined) updates.linkedin_url = req.body.linkedinUrl;
    if (req.body.githubUrl !== undefined) updates.github_url = req.body.githubUrl;
    if (req.body.portfolioUrl !== undefined) updates.portfolio_url = req.body.portfolioUrl;
    if (req.body.yearsExperience !== undefined) updates.years_experience = req.body.yearsExperience;
    if (req.body.preferredSalaryMin !== undefined) updates.preferred_salary_min = req.body.preferredSalaryMin;
    if (req.body.preferredSalaryMax !== undefined) updates.preferred_salary_max = req.body.preferredSalaryMax;
    if (req.body.remotePreference !== undefined) updates.remote_preference = req.body.remotePreference;
    if (req.body.location !== undefined) updates.location = req.body.location;
    if (req.body.onboardingCompleted !== undefined) updates.onboarding_completed = req.body.onboardingCompleted;
    
    const user = await updateUser(req.userId!, updates);
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/complete-onboarding', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await updateUser(req.userId!, { onboarding_completed: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;