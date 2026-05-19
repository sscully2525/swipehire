import { Router, Request, Response } from 'express';
import { query } from '../db';
import { getRecommendations } from '../services/ai';
import { logger } from '../logger';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    // Get user's swipe stats
    const swipeStats = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE direction = 'right') as total_right_swipes,
        COUNT(*) FILTER (WHERE direction = 'left') as total_left_swipes,
        COUNT(*) FILTER (WHERE direction = 'right' AND created_at > CURRENT_DATE) as today_swipes,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as last_7_days_swipes
      FROM swipes WHERE user_id = $1`,
      [req.userId!]
    );
    
    // Get match stats
    const matchStats = await query(
      `SELECT 
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_matches,
        COUNT(*) FILTER (WHERE status = 'interview_scheduled') as scheduled_interviews
      FROM matches WHERE user_id = $1`,
      [req.userId!]
    );
    
    // Get top matching companies
    const topMatches = await query(
      `SELECT s.name, s.stage, m.created_at
       FROM matches m
       JOIN startups s ON m.startup_id = s.id
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC
       LIMIT 5`,
      [req.userId!]
    );
    
    // Get skill match distribution
    const skillMatches = await query(
      `SELECT unnest(j.tech_stack) as skill, COUNT(*) as count
       FROM swipes sw
       JOIN jobs j ON sw.job_id = j.id
       WHERE sw.user_id = $1 AND sw.direction = 'right'
       GROUP BY skill
       ORDER BY count DESC
       LIMIT 5`,
      [req.userId!]
    );
    
    res.json({
      swipes: swipeStats.rows[0],
      matches: matchStats.rows[0],
      topMatches: topMatches.rows,
      skillMatches: skillMatches.rows
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Analytics dashboard error');
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});


router.get('/candidate', authenticate, async (req: Request, res: Response) => {
  try {
    const [swipeStats, matchStats, messageStats, allowance] = await Promise.all([
      query(
        `SELECT
          COUNT(*) FILTER (WHERE direction = 'right')::int as "swipesRight",
          COUNT(*) FILTER (WHERE direction = 'left')::int as "swipesLeft",
          COUNT(*) FILTER (WHERE created_at > CURRENT_DATE)::int as "swipesToday"
         FROM swipes WHERE user_id = $1`,
        [req.userId!]
      ),
      query(`SELECT COUNT(*)::int as matches FROM matches WHERE user_id = $1`, [req.userId!]),
      query(
        `SELECT COUNT(*)::int as messages
         FROM chat_messages msg
         JOIN matches m ON m.id = msg.match_id
         WHERE m.user_id = $1`,
        [req.userId!]
      ),
      query(`SELECT daily_swipes, subscription_tier FROM users WHERE id = $1`, [req.userId!]),
    ]);

    const dailyLimit = allowance.rows[0]?.daily_swipes ?? 10;
    const swipesToday = swipeStats.rows[0]?.swipesToday ?? 0;
    res.json({
      swipesRight: swipeStats.rows[0]?.swipesRight ?? 0,
      swipesLeft: swipeStats.rows[0]?.swipesLeft ?? 0,
      swipesToday,
      remainingSwipes: Math.max(0, dailyLimit - swipesToday),
      matches: matchStats.rows[0]?.matches ?? 0,
      messages: messageStats.rows[0]?.messages ?? 0,
      subscriptionTier: allowance.rows[0]?.subscription_tier ?? 'free',
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Candidate analytics error');
    res.status(500).json({ error: 'Failed to fetch candidate analytics' });
  }
});

router.get('/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const recommendations = await getRecommendations(req.userId!, 5);
    res.json(recommendations);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Recommendations error');
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;
