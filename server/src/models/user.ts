import { query } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../index';

// In production, server bootstrap (src/index.ts) refuses to start if these
// are missing or look like placeholders. Defaults are only used in dev/test.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-do-not-use-in-prod';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  title?: string;
  bio?: string;
  skills?: string[];
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  resume_url?: string;
  avatar_url?: string;
  video_intro_url?: string;
  location?: string;
  years_experience?: number;
  preferred_salary_min?: number;
  preferred_salary_max?: number;
  remote_preference?: string;
  daily_swipes: number;
  subscription_tier: string;
  email_verified: boolean;
  linkedin_verified: boolean;
  identity_verified: boolean;
  onboarding_completed: boolean;
  last_active_at?: Date;
}

export const createUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: string = 'candidate'
): Promise<User> => {
  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  
  const result = await query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, daily_swipes, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, first_name, last_name, title, bio, skills, linkedin_url, 
               github_url, portfolio_url, resume_url, avatar_url, video_intro_url,
               location, years_experience, preferred_salary_min, preferred_salary_max,
               remote_preference, daily_swipes, subscription_tier, email_verified,
               linkedin_verified, identity_verified, onboarding_completed, last_active_at`,
    [id, email, passwordHash, firstName, lastName, 10, role]
  );
  
  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<any> => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

export const findUserById = async (id: string): Promise<User | null> => {
  // Try cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await query(
    `SELECT id, email, first_name, last_name, role, title, bio, skills, linkedin_url,
            github_url, portfolio_url, resume_url, avatar_url, video_intro_url,
            location, years_experience, preferred_salary_min, preferred_salary_max,
            remote_preference, daily_swipes, subscription_tier, email_verified,
            linkedin_verified, identity_verified, onboarding_completed, last_active_at
     FROM users WHERE id = $1`,
    [id]
  );
  
  const user = result.rows[0] || null;
  if (user) {
    await redis.setEx(`user:${id}`, 3600, JSON.stringify(user));
  }
  
  return user;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
  const allowedFields = [
    'title', 'bio', 'skills', 'linkedin_url', 'github_url', 'portfolio_url',
    'resume_url', 'avatar_url', 'video_intro_url', 'location', 'years_experience',
    'preferred_salary_min', 'preferred_salary_max', 'remote_preference',
    'onboarding_completed'
  ];
  
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
  
  // Invalidate cache
  await redis.del(`user:${id}`);
  
  return result.rows[0];
};

export const updateLastActive = async (userId: string): Promise<void> => {
  await query(
    'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): any => {
  const decoded: any = jwt.verify(token, JWT_SECRET);
  // Reject tokens minted with `type: 'refresh'` from being used as access tokens.
  if (decoded && decoded.type && decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
};

export const verifyRefreshToken = (token: string): any => {
  const decoded: any = jwt.verify(token, JWT_REFRESH_SECRET);
  if (decoded && decoded.type && decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
};

/**
 * Verifies the refresh token signature/expiry AND enforces rotation by
 * comparing the presented token against the one stored in Redis. Reject
 * if mismatch (re-use of an old refresh token).
 */
export const verifyAndConsumeRefreshToken = async (
  token: string
): Promise<{ userId: string }> => {
  const decoded = verifyRefreshToken(token);
  const stored = await redis.get(`refresh:${decoded.userId}`);
  if (!stored || stored !== token) {
    throw new Error('Refresh token revoked or rotated');
  }
  return { userId: decoded.userId };
};

export const storeRefreshToken = async (userId: string, token: string): Promise<void> => {
  await redis.setEx(`refresh:${userId}`, 7 * 24 * 3600, token);
};

export const invalidateRefreshToken = async (userId: string): Promise<void> => {
  await redis.del(`refresh:${userId}`);
};

export const getSwipeLimit = (tier: string): number => {
  const limits: Record<string, number> = {
    free: 10,
    pro: 50,
    unlimited: 999999
  };
  return limits[tier] || 10;
};