import { Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { verifyAccessToken } from '../models/user';

/**
 * Verifies the JWT access token from the `Authorization` header,
 * validates the `type === 'access'` claim and attaches `req.userId`.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    if (decoded?.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Restrict a route to one or more user roles. Must be used after
 * `authenticate`. Looks up role from the DB (single short query) — fine
 * for our scale; can be cached if it becomes hot.
 */
export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await query('SELECT role FROM users WHERE id = $1', [
        userId,
      ]);
      const role = result.rows[0]?.role;
      if (!role || !roles.includes(role)) {
        return res
          .status(403)
          .json({ error: `Requires role: ${roles.join(' or ')}` });
      }
      (req as Request & { userRole?: string }).userRole = role;
      next();
    } catch {
      return res.status(500).json({ error: 'Auth check failed' });
    }
  };
};

export const requireAdmin = requireRole('admin');
export const requireRecruiter = requireRole('recruiter', 'admin');
