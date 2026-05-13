import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyAndConsumeRefreshToken,
  storeRefreshToken,
  invalidateRefreshToken,
} from '../models/user';
import { query } from '../db';
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
        role: 'candidate',
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
        role: user.role || 'candidate',
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

    // Enforces rotation: rejects any refresh token that doesn't match
    // the one currently stored in Redis for this user (i.e. reuse of an
    // older refresh token after a rotation will fail).
    const { userId } = await verifyAndConsumeRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userId);
    await storeRefreshToken(userId, newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
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
  } catch {
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

    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: (user as any).role,
      title: user.title,
      dailySwipes: user.daily_swipes,
      subscriptionTier: user.subscription_tier,
      onboardingCompleted: user.onboarding_completed
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// LinkedIn OAuth - redirect to LinkedIn authorization
router.get('/linkedin', (req: Request, res: Response) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'LinkedIn OAuth not configured' });
  }
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:3001'}/api/auth/linkedin/callback`;
  const scope = 'openid profile email';
  const state = Math.random().toString(36).substring(2);
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(url);
});

// LinkedIn OAuth callback
router.get('/linkedin/callback', async (req: Request, res: Response) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${clientUrl}/login?error=linkedin_failed`);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:3001'}/api/auth/linkedin/callback`;

    // Exchange code for token
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenRes.data.access_token;

    // Get LinkedIn user info (OpenID Connect userinfo endpoint)
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const { sub: linkedinId, email, given_name: firstName, family_name: lastName } = profileRes.data;
    if (!email) {
      return res.redirect(`${clientUrl}/login?error=linkedin_no_email`);
    }

    // Find or create user
    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser(email, Math.random().toString(36), firstName || 'LinkedIn', lastName || 'User');
    }

    // Mark LinkedIn as verified and invalidate cache
    await query('UPDATE users SET linkedin_verified = true, linkedin_url = $1 WHERE id = $2',
      [`https://www.linkedin.com/in/${linkedinId}`, user.id]);
    const { redis } = await import('../index');
    await redis.del(`user:${user.id}`);

    const tokens = generateTokens(user.id);
    await storeRefreshToken(user.id, tokens.refreshToken);

    logger.info('LinkedIn OAuth login', { userId: user.id, email });

    // Redirect to client with tokens
    res.redirect(`${clientUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&role=${user.role || 'candidate'}`);
  } catch (error) {
    logger.error('LinkedIn callback error', { error });
    res.redirect(`${clientUrl}/login?error=linkedin_failed`);
  }
});

export default router;