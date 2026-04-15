import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  createUser, 
  findUserByEmail, 
  verifyPassword, 
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  invalidateRefreshToken
} from '../models/user';
import { logger } from '../index';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const user = await createUser(email, password, firstName, lastName);
    const { accessToken, refreshToken } = generateTokens(user.id);
    await storeRefreshToken(user.id, refreshToken);
    
    logger.info('User signed up', { userId: user.id, email });
    
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        dailySwipes: user.daily_swipes,
        subscriptionTier: user.subscription_tier,
        onboardingCompleted: user.onboarding_completed
      }
    });
  } catch (error) {
    logger.error('Signup error', { error });
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    await storeRefreshToken(user.id, refreshToken);
    
    logger.info('User logged in', { userId: user.id });
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        title: user.title,
        dailySwipes: user.daily_swipes,
        subscriptionTier: user.subscription_tier,
        onboardingCompleted: user.onboarding_completed
      }
    });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    const decoded = verifyRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    await storeRefreshToken(decoded.userId, newRefreshToken);
    
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyAccessToken(token);
        await invalidateRefreshToken(decoded.userId);
      } catch {}
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Recruiter/Company Registration
router.post('/recruiter/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('companyName').trim().isLength({ min: 1 }),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;
    
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Create user with recruiter role
    const user = await createUser(email, password, firstName, lastName, 'recruiter');
    
    // Create company
    const { query } = await import('../db');
    const { v4: uuidv4 } = await import('uuid');
    const startupId = uuidv4();
    
    await query(
      `INSERT INTO startups (id, name, slug, description, stage, created_by, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [startupId, companyName, companyName.toLowerCase().replace(/\s+/g, '-'), `${companyName} - A growing company`, 'Seed', user.id, false]
    );
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    await storeRefreshToken(user.id, refreshToken);
    
    logger.info('Recruiter signed up', { userId: user.id, email, companyId: startupId });
    
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'recruiter',
        companyId: startupId
      }
    });
  } catch (error) {
    logger.error('Recruiter signup error', { error });
    res.status(500).json({ error: 'Failed to create recruiter account' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    const user = await findUserByEmail(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      title: user.title,
      dailySwipes: user.daily_swipes,
      subscriptionTier: user.subscription_tier,
      onboardingCompleted: user.onboarding_completed
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;