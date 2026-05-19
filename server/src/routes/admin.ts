import { Router, Request, Response } from 'express';
import { query } from '../db';
import { logger } from '../logger';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Platform stats
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_users_last_7_days,
        COUNT(*) FILTER (WHERE last_active_at > CURRENT_DATE - INTERVAL '1 day') as daily_active_users
      FROM users
    `);
    
    const swipeStats = await query(`
      SELECT 
        COUNT(*) as total_swipes,
        COUNT(*) FILTER (WHERE direction = 'right') as right_swipes,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as swipes_today
      FROM swipes
    `);
    
    const matchStats = await query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE status = 'interview_scheduled') as scheduled_interviews
      FROM matches
    `);
    
    const startupStats = await query(`
      SELECT 
        COUNT(*) as total_startups,
        COUNT(*) FILTER (WHERE verified = true) as verified_startups
      FROM startups
    `);
    
    res.json({
      users: userStats.rows[0],
      swipes: swipeStats.rows[0],
      matches: matchStats.rows[0],
      startups: startupStats.rows[0]
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Admin stats error');
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await query(`
      SELECT id, email, first_name, last_name, title, subscription_tier, 
             created_at, last_active_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Admin get users error');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
