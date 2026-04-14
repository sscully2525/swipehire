import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { getJobsForSwiping, getJobById, incrementJobViews, seedStartupsAndJobs } from '../models/startup';
import { verifyAccessToken } from '../models/user';
import { calculateMatchScore } from '../services/ai';
import { redis } from '../index';

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
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/filters', authenticate, async (req: Request, res: Response) => {
  try {
    // Get available filters
    const stagesResult = await query('SELECT DISTINCT stage FROM startups ORDER BY stage');
    const techResult = await query(`
      SELECT DISTINCT unnest(tech_stack) as tech 
      FROM jobs 
      WHERE tech_stack IS NOT NULL 
      ORDER BY tech
    `);
    const locationsResult = await query('SELECT DISTINCT location FROM startups WHERE location IS NOT NULL ORDER BY location');
    
    res.json({
      stages: stagesResult.rows.map(r => r.stage),
      techStack: techResult.rows.map(r => r.tech),
      locations: locationsResult.rows.map(r => r.location)
    });
  } catch (error) {
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
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/seed', async (req: Request, res: Response) => {
  try {
    await seedStartupsAndJobs();
    res.json({ message: 'Startups and jobs seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

export default router;