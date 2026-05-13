import { Router, Request, Response } from 'express';
import { query } from '../db';
import { getJobsForSwiping, getJobById, incrementJobViews, seedStartupsAndJobs } from '../models/startup';
import { calculateMatchScore } from '../services/ai';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const filters = {
      remoteOnly: req.query.remote === 'true',
      minSalary: req.query.minSalary ? parseInt(req.query.minSalary as string) : undefined,
      stages: req.query.stages ? (req.query.stages as string).split(',') : undefined,
      techStack: req.query.tech ? (req.query.tech as string).split(',') : undefined
    };
    
    const jobs = await getJobsForSwiping(req.userId!, filters);
    
    // Calculate AI match scores
    const jobsWithScores = await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        match_score: await calculateMatchScore(req.userId!, job.id)
      }))
    );
    
    // Sort by match score (highest first)
    jobsWithScores.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    
    res.json(jobsWithScores);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get jobs error');
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/filters', authenticate, async (req: Request, res: Response) => {
  try {
    // Get available filters
    const stagesResult = await query('SELECT DISTINCT stage FROM startups WHERE COALESCE(is_demo, false) = false ORDER BY stage');
    const techResult = await query(`
      SELECT DISTINCT unnest(tech_stack) as tech 
      FROM jobs j
      JOIN startups s ON j.startup_id = s.id
      WHERE tech_stack IS NOT NULL
        AND COALESCE(s.is_demo, false) = false
      ORDER BY tech
    `);
    const locationsResult = await query('SELECT DISTINCT location FROM startups WHERE location IS NOT NULL AND COALESCE(is_demo, false) = false ORDER BY location');
    
    res.json({
      stages: stagesResult.rows.map(r => r.stage),
      techStack: techResult.rows.map(r => r.tech),
      locations: locationsResult.rows.map(r => r.location)
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Increment view count
    await incrementJobViews(req.params.id);
    
    // Calculate match score
    const matchScore = await calculateMatchScore(req.userId!, req.params.id);
    
    res.json({ ...job, match_score: matchScore });
  } catch (error) {
    logger.error({ err: error, userId: req.userId, jobId: req.params.id }, 'Get job error');
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Seed startup/job fixtures. Locked down behind admin auth AND blocked
// in production — this was previously unauthenticated and reachable
// from the public internet. (audit 🔴)
router.post('/seed', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Seeding is disabled in production' });
    }
    await seedStartupsAndJobs();
    res.json({ message: 'Startups and jobs seeded successfully' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Seed jobs error');
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

export default router;