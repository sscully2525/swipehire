import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
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
import { query, getClient } from '../db';
import { logger, redis } from '../index';
import { validatePassword } from '../utils/password';

const router = Router();

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
    return cookies;
  }, {});
};


const slugifyCompany = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'company';

const reserveUniqueCompanySlug = async (
  client: Awaited<ReturnType<typeof getClient>>,
  companyName: string,
): Promise<string> => {
  const base = slugifyCompany(companyName);
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await client.query('SELECT 1 FROM startups WHERE slug = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
};


// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array();
    return res.status(400).json({
      error: validationErrors[0]?.msg || 'Invalid request',
      errors: validationErrors,
    });
  }
  next();
};

router.post('/signup', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isString().isLength({ min: 10, max: 256 }).withMessage('Password must be at least 10 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Strong-password policy (rule-based + zxcvbn score)
    const pw = validatePassword(password, { email, firstName, lastName });
    if (!pw.valid) {
      return res.status(400).json({
        error: pw.errors[0],
        errors: pw.errors,
        passwordFeedback: pw.feedback,
      });
    }

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
  } catch (err) {
    logger.error({ err }, 'Logout error');
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Recruiter/Company Registration
router.post('/recruiter/signup', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isString().isLength({ min: 10, max: 256 }).withMessage('Password must be at least 10 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('companyName').trim().isLength({ min: 1 }).withMessage('Company name is required'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    const pw = validatePassword(password, { email, firstName, lastName });
    if (!pw.valid) {
      return res.status(400).json({
        error: pw.errors[0],
        errors: pw.errors,
        passwordFeedback: pw.feedback,
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const client = await getClient();
    let user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
    let startupId: string;
    let companySlug: string;

    try {
      await client.query('BEGIN');

      // Create user with recruiter role in the same transaction as company
      // creation so a company insert failure never leaves a stranded recruiter
      // account that cannot finish onboarding.
      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);
      const userResult = await client.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, daily_swipes, role, onboarding_completed)
         VALUES ($1, $2, $3, $4, $5, 0, 'recruiter', true)
         RETURNING id, email, first_name, last_name`,
        [userId, email, passwordHash, firstName, lastName]
      );
      user = userResult.rows[0];

      startupId = uuidv4();
      companySlug = await reserveUniqueCompanySlug(client, companyName);

      await client.query(
        `INSERT INTO startups (id, name, slug, description, stage, created_by, verified, is_demo, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, 'user')`,
        [startupId, companyName, companySlug, `${companyName} is hiring on Gigly`, 'Seed', user.id, false]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await storeRefreshToken(user.id, refreshToken);
    
    logger.info('Recruiter signed up', { userId: user.id, email, companyId: startupId, companySlug });
    
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'recruiter',
        companyId: startupId,
        companySlug
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
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: 'LinkedIn OAuth not configured' });
  }
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:3001'}/api/auth/linkedin/callback`;
  const scope = 'openid profile email';
  const state = uuidv4();
  res.cookie('linkedin_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  });
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(url);
});

// LinkedIn OAuth callback
router.get('/linkedin/callback', async (req: Request, res: Response) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${clientUrl}/login?error=linkedin_failed`);
    }
    const expectedState = parseCookieHeader(req.headers.cookie).linkedin_oauth_state;
    res.clearCookie('linkedin_oauth_state');
    if (!expectedState || typeof state !== 'string' || state !== expectedState) {
      return res.redirect(`${clientUrl}/login?error=linkedin_failed`);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.redirect(`${clientUrl}/login?error=linkedin_failed`);
    }
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

    // Find or create user. OAuth users never use this password to log in —
    // it only exists to satisfy the NOT NULL hash column — but it must still
    // be unguessable, so use the CSPRNG, not Math.random().
    let user = await findUserByEmail(email);
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await createUser(email, randomPassword, firstName || 'LinkedIn', lastName || 'User');
    }

    // Mark LinkedIn as verified and invalidate cache
    await query('UPDATE users SET linkedin_verified = true, linkedin_url = $1 WHERE id = $2',
      [`https://www.linkedin.com/in/${linkedinId}`, user.id]);
    const { redis } = await import('../index');
    await redis.del(`user:${user.id}`);

    const tokens = generateTokens(user.id);
    await storeRefreshToken(user.id, tokens.refreshToken);

    logger.info('LinkedIn OAuth login', { userId: user.id, email });

    // Never put JWTs in the redirect URL — query strings end up in browser
    // history, server access logs, and Referer headers. Instead, park the
    // tokens in Redis under a short-lived one-time code; the client trades
    // the code for tokens via POST /auth/oauth/exchange.
    const oneTimeCode = crypto.randomBytes(32).toString('hex');
    await redis.setEx(
      `oauth_code:${oneTimeCode}`,
      60,
      JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        role: user.role || 'candidate',
      })
    );
    res.redirect(`${clientUrl}/auth/callback?code=${oneTimeCode}`);
  } catch (error) {
    logger.error('LinkedIn callback error', { error });
    res.redirect(`${clientUrl}/login?error=linkedin_failed`);
  }
});

// Trade a one-time OAuth code (set by the provider callback above) for the
// actual JWTs. The code is single-use: it's deleted before the tokens are
// returned, so a replayed/leaked URL yields nothing.
router.post('/oauth/exchange', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    const key = `oauth_code:${code}`;
    const payload = await redis.get(key);
    if (!payload) {
      return res.status(401).json({ error: 'Code expired or already used' });
    }
    await redis.del(key);

    res.json(JSON.parse(payload));
  } catch (error) {
    logger.error('OAuth code exchange error', { error });
    res.status(500).json({ error: 'Failed to complete sign-in' });
  }
});

// Password strength check — front-end calls this for real-time feedback so
// it shares the exact same rules as the server. Doesn't reveal whether an
// email is taken; that's a different endpoint.
router.post('/password/check', [body('password').isString()], async (req: Request, res: Response) => {
  const { password, email, firstName, lastName } = req.body as Record<string, string>;
  const result = validatePassword(password || '', { email, firstName, lastName });
  res.json({
    valid: result.valid,
    score: result.score ?? 0,
    errors: result.errors,
    feedback: result.feedback ?? [],
  });
});

// Change password (authenticated). Requires the current password.
router.post('/password/change', [
  body('currentPassword').isString(),
  body('newPassword').isString().isLength({ min: 10, max: 256 }),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const result = await query('SELECT id, email, first_name, last_name, password_hash FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { verifyPassword } = await import('../models/user');
    const ok = await verifyPassword(req.body.currentPassword, user.password_hash);
    if (!ok) return res.status(403).json({ error: 'Current password is incorrect' });

    const pw = validatePassword(req.body.newPassword, {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });
    if (!pw.valid) {
      return res.status(400).json({ error: pw.errors[0], errors: pw.errors, passwordFeedback: pw.feedback });
    }

    const bcrypt = await import('bcryptjs');
    const newHash = await bcrypt.hash(req.body.newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, user.id]);
    // Invalidate any active refresh token so other sessions must re-auth.
    try {
      const { invalidateRefreshToken } = await import('../models/user');
      await invalidateRefreshToken(user.id);
    } catch {
      /* best-effort */
    }
    logger.info('Password changed', { userId: user.id });
    res.json({ message: 'Password updated. Please sign in again.' });
  } catch (err: any) {
    logger.error('Password change error', { err: err?.message });
    res.status(401).json({ error: 'Failed to change password' });
  }
});

// Password reset — request a one-time code (email delivery left to existing
// verification transport). The endpoint always returns 200 to avoid
// revealing whether the email is registered.
router.post('/password/reset/request', [
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const user = await findUserByEmail(req.body.email);
    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await (await import('bcryptjs')).hash(code, 8);
      await query(
        `INSERT INTO verification_codes (user_id, code_hash, purpose, expires_at)
         VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '15 minutes')
         ON CONFLICT DO NOTHING`,
        [user.id, codeHash],
      ).catch(() => {
        // Table may not exist in all environments; reset is best-effort here.
        logger.warn('verification_codes table missing; reset request not stored');
      });
      logger.info('Password reset requested', { userId: user.id });
      // Email transport is wired through routes/verification; this MVP just logs
      // the code in dev so testers can use it. In prod, hook into the same
      // email transport used elsewhere.
      if (process.env.NODE_ENV !== 'production') {
        logger.warn({ userId: user.id, code }, '[DEV ONLY] password reset code');
      }
    }
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err: any) {
    logger.error('Password reset request error', { err: err?.message });
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  }
});

// Confirm reset: { email, code, newPassword }
router.post('/password/reset/confirm', [
  body('email').isEmail().normalizeEmail(),
  body('code').isString().isLength({ min: 4, max: 12 }),
  body('newPassword').isString().isLength({ min: 10, max: 256 }),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const user = await findUserByEmail(req.body.email);
    if (!user) return res.status(400).json({ error: 'Invalid code or email' });

    const codeRows = await query(
      `SELECT id, code_hash FROM verification_codes
       WHERE user_id = $1 AND purpose = 'password_reset' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 5`,
      [user.id],
    ).catch(() => ({ rows: [] as any[] }));

    const bcrypt = await import('bcryptjs');
    let matched: any = null;
    for (const row of codeRows.rows) {
      if (await bcrypt.compare(req.body.code, row.code_hash)) { matched = row; break; }
    }
    if (!matched) return res.status(400).json({ error: 'Invalid code or email' });

    const pw = validatePassword(req.body.newPassword, {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });
    if (!pw.valid) {
      return res.status(400).json({ error: pw.errors[0], errors: pw.errors, passwordFeedback: pw.feedback });
    }

    const newHash = await bcrypt.hash(req.body.newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, user.id]);
    await query('DELETE FROM verification_codes WHERE id = $1', [matched.id]).catch(() => {});
    try {
      const { invalidateRefreshToken } = await import('../models/user');
      await invalidateRefreshToken(user.id);
    } catch {
      /* best-effort */
    }
    logger.info('Password reset', { userId: user.id });
    res.json({ message: 'Password updated. Please sign in.' });
  } catch (err: any) {
    logger.error('Password reset confirm error', { err: err?.message });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
