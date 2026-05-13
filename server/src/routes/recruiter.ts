import { Router } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRecruiter } from '../middleware/auth';
import {
  createRecruiterSwipe,
  candidateHasRightSwipe,
} from '../models/swipe';

const router = Router();

const slugifyCompany = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'company';


// All recruiter routes require an authenticated user with the recruiter
// (or admin) role. Previously these were authenticated-only, so any
// candidate could hit them.
router.use(authenticate, requireRecruiter);

// Get recruiter's companies
router.get('/companies', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM jobs WHERE startup_id = s.id) as job_count,
        (SELECT COUNT(*) FROM matches WHERE startup_id = s.id) as match_count
       FROM startups s
       WHERE s.created_by = $1
       ORDER BY s.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Create company
router.post('/companies', async (req, res) => {
  try {
    const { name, description, mission, stage, location, size, website } = req.body;

    if (!name || !description || !stage) {
      return res.status(400).json({ error: 'name, description, and stage are required' });
    }

    const id = uuidv4();
    const baseSlug = slugifyCompany(name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    await query(
      `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, website, created_by, is_demo, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, 'user')`,
      [id, name, slug, description, mission, stage, location, size, website, req.userId]
    );

    res.status(201).json({ id, slug, message: 'Company created' });
  } catch {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Get company details
router.get('/companies/:id', async (req, res) => {
  try {
    const companyResult = await query(
      `SELECT s.* FROM startups s
       WHERE s.id = $1 AND s.created_by = $2`,
      [req.params.id, req.userId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const jobsResult = await query(
      'SELECT * FROM jobs WHERE startup_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      ...companyResult.rows[0],
      jobs: jobsResult.rows,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Create job posting
router.post('/companies/:id/jobs', async (req, res) => {
  try {
    const companyResult = await query(
      'SELECT id FROM startups WHERE id = $1 AND created_by = $2',
      [req.params.id, req.userId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const {
      title, description, requirements, responsibilities,
      salaryMin, salaryMax, equityMin, equityMax,
      location, remoteAllowed, visaSponsorship,
      employmentType, techStack, experienceLevel,
    } = req.body;

    const id = uuidv4();

    await query(
      `INSERT INTO jobs (id, startup_id, title, description, requirements, responsibilities,
                         salary_min, salary_max, equity_min, equity_max, location, remote_allowed,
                         visa_sponsorship, employment_type, tech_stack, experience_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [id, req.params.id, title, description, requirements, responsibilities,
       salaryMin, salaryMax, equityMin, equityMax, location, remoteAllowed,
       visaSponsorship, employmentType, techStack, experienceLevel]
    );

    res.status(201).json({ id, message: 'Job created' });
  } catch {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Get candidates who swiped right on company's jobs
router.get('/candidates', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT 
        u.id, u.first_name, u.last_name, u.title, u.bio, u.skills, 
        u.linkedin_url, u.github_url, u.avatar_url, u.years_experience,
        s.id as startup_id, s.name as startup_name,
        j.id as job_id, j.title as job_title,
        sw.created_at as swiped_at, sw.ai_match_score
       FROM swipes sw
       JOIN jobs j ON sw.job_id = j.id
       JOIN startups s ON j.startup_id = s.id
       JOIN users u ON sw.user_id = u.id
       WHERE s.created_by = $1 
         AND sw.direction = 'right'
         AND NOT EXISTS (
           SELECT 1 FROM matches m 
           WHERE m.user_id = u.id AND m.job_id = j.id
         )
       ORDER BY sw.ai_match_score DESC, sw.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Get matches for recruiter's companies
router.get('/matches', async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, 
        u.first_name, u.last_name, u.title, u.bio, u.skills, 
        u.linkedin_url, u.github_url, u.avatar_url,
        s.name as startup_name, s.logo_url as startup_logo,
        j.title as job_title, j.salary_min, j.salary_max
       FROM matches m
       JOIN users u ON m.user_id = u.id
       JOIN startups s ON m.startup_id = s.id
       JOIN jobs j ON m.job_id = j.id
       WHERE s.created_by = $1
       ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Like a candidate. Records a recruiter-side right-swipe and ONLY
// creates a match if the candidate has already right-swiped this job.
// Previously this created matches unconditionally (audit 🟠).
router.post('/candidates/:userId/like', async (req, res) => {
  try {
    const { jobId } = req.body;
    const candidateId = req.params.userId;

    // Verify job belongs to recruiter
    const jobResult = await query(
      `SELECT j.*, s.created_by, s.id as startup_id
         FROM jobs j
         JOIN startups s ON j.startup_id = s.id
        WHERE j.id = $1`,
      [jobId]
    );

    if (jobResult.rows.length === 0 || jobResult.rows[0].created_by !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Record recruiter swipe (right)
    await createRecruiterSwipe(req.userId!, candidateId, jobId, 'right');

    // Only create a match if both sides have swiped right.
    const candidateRight = await candidateHasRightSwipe(candidateId, jobId);

    if (!candidateRight) {
      return res.json({
        message: 'Interest recorded; awaiting candidate swipe',
        matchId: null,
      });
    }

    const matchId = uuidv4();
    await query(
      `INSERT INTO matches (id, user_id, job_id, startup_id, status, company_interest_level)
       VALUES ($1, $2, $3, $4, 'pending', 5)
       ON CONFLICT (user_id, job_id) DO UPDATE SET
         company_interest_level = 5,
         status = 'pending'`,
      [matchId, candidateId, jobId, jobResult.rows[0].startup_id]
    );

    // Notify candidate
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'match', 'New Match!', 'A company wants to connect with you!', $2)`,
      [candidateId, JSON.stringify({ matchId, jobId })]
    );

    res.json({ message: 'Match created', matchId });
  } catch {
    res.status(500).json({ error: 'Failed to like candidate' });
  }
});

// Pass on a candidate
router.post('/candidates/:userId/pass', async (req, res) => {
  try {
    const { jobId } = req.body;

    // Verify the job belongs to this recruiter
    const jobResult = await query(
      `SELECT j.id FROM jobs j
         JOIN startups s ON j.startup_id = s.id
        WHERE j.id = $1 AND s.created_by = $2`,
      [jobId, req.userId]
    );
    if (jobResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await createRecruiterSwipe(req.userId!, req.params.userId, jobId, 'left');

    res.json({ message: 'Candidate passed' });
  } catch {
    res.status(500).json({ error: 'Failed to pass on candidate' });
  }
});

// Get recruiter dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const companiesResult = await query(
      'SELECT COUNT(*) as count FROM startups WHERE created_by = $1',
      [req.userId]
    );

    const jobsResult = await query(
      `SELECT COUNT(*) as count FROM jobs j
       JOIN startups s ON j.startup_id = s.id
       WHERE s.created_by = $1`,
      [req.userId]
    );

    const candidatesResult = await query(
      `SELECT COUNT(DISTINCT sw.user_id) as count 
       FROM swipes sw
       JOIN jobs j ON sw.job_id = j.id
       JOIN startups s ON j.startup_id = s.id
       WHERE s.created_by = $1 AND sw.direction = 'right'`,
      [req.userId]
    );

    const matchesResult = await query(
      `SELECT COUNT(*) as count FROM matches m
       JOIN startups s ON m.startup_id = s.id
       WHERE s.created_by = $1`,
      [req.userId]
    );

    // Recent activity
    const recentActivity = await query(
      `SELECT sw.created_at, u.first_name, u.last_name, u.title, j.title as job_title
       FROM swipes sw
       JOIN users u ON sw.user_id = u.id
       JOIN jobs j ON sw.job_id = j.id
       JOIN startups s ON j.startup_id = s.id
       WHERE s.created_by = $1 AND sw.direction = 'right'
       ORDER BY sw.created_at DESC
       LIMIT 10`,
      [req.userId]
    );

    res.json({
      stats: {
        companies: parseInt(companiesResult.rows[0].count),
        jobs: parseInt(jobsResult.rows[0].count),
        interestedCandidates: parseInt(candidatesResult.rows[0].count),
        matches: parseInt(matchesResult.rows[0].count),
      },
      recentActivity: recentActivity.rows,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;
