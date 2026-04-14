import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { createUser, findUserByEmail, generateTokens, storeRefreshToken } from '../models/user';
import { createStartup, createJob } from '../models/startup';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create admin account
router.post('/setup-admin', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await query(
      "SELECT * FROM users WHERE email = $1 AND role = 'admin'",
      [email]
    );
    
    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({ error: 'Admin already exists' });
    }
    
    // Create admin user
    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    
    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5, 'admin', true, true)`,
      [id, email, passwordHash, firstName, lastName]
    );
    
    res.json({ message: 'Admin created successfully', userId: id });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Seed admin with demo company
router.post('/seed-admin-company', async (req, res) => {
  try {
    const { adminEmail } = req.body;
    
    // Get admin user
    const adminResult = await query(
      "SELECT id FROM users WHERE email = $1 AND role = 'admin'",
      [adminEmail]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const adminId = adminResult.rows[0].id;
    
    // Create demo startup
    const startupId = uuidv4();
    await query(
      `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, website, verified, featured, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        startupId,
        'Grand Ventures',
        'grand-ventures',
        'A cutting-edge technology company building the future of AI-powered solutions.',
        'Empowering businesses through intelligent automation',
        'Series A',
        'New York, NY',
        '20-50',
        'https://grandventures.io',
        true,
        true,
        adminId
      ]
    );
    
    // Create demo jobs
    const jobs = [
      {
        title: 'Senior Full Stack Engineer',
        description: 'Lead our engineering team in building scalable AI solutions.',
        salary_min: 180000,
        salary_max: 250000,
        equity_min: 0.005,
        equity_max: 0.015,
        location: 'New York, NY',
        remote_allowed: true,
        tech_stack: ['React', 'Node.js', 'Python', 'AWS', 'PostgreSQL'],
        experience_level: 'senior'
      },
      {
        title: 'Product Designer',
        description: 'Design intuitive interfaces for our AI platform.',
        salary_min: 130000,
        salary_max: 180000,
        equity_min: 0.003,
        equity_max: 0.008,
        location: 'New York, NY',
        remote_allowed: true,
        tech_stack: ['Figma', 'React', 'Design Systems'],
        experience_level: 'senior'
      },
      {
        title: 'Machine Learning Engineer',
        description: 'Build and deploy ML models at scale.',
        salary_min: 200000,
        salary_max: 300000,
        equity_min: 0.008,
        equity_max: 0.02,
        location: 'New York, NY',
        remote_allowed: true,
        tech_stack: ['Python', 'PyTorch', 'TensorFlow', 'AWS', 'Kubernetes'],
        experience_level: 'senior'
      }
    ];
    
    for (const job of jobs) {
      const jobId = uuidv4();
      await query(
        `INSERT INTO jobs (id, startup_id, title, description, salary_min, salary_max, equity_min, equity_max, location, remote_allowed, tech_stack, experience_level, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')`,
        [jobId, startupId, job.title, job.description, job.salary_min, job.salary_max, 
         job.equity_min, job.equity_max, job.location, job.remote_allowed, job.tech_stack, job.experience_level]
      );
    }
    
    res.json({ message: 'Admin company seeded successfully', startupId });
  } catch (error) {
    console.error('Seed admin company error:', error);
    res.status(500).json({ error: 'Failed to seed admin company' });
  }
});

// Get admin dashboard stats
router.get('/admin-stats', async (req, res) => {
  try {
    const [
      usersResult,
      swipesResult,
      matchesResult,
      startupsResult,
      jobsResult,
      messagesResult
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM swipes'),
      query('SELECT COUNT(*) as count FROM matches'),
      query('SELECT COUNT(*) as count FROM startups'),
      query('SELECT COUNT(*) as count FROM jobs'),
      query('SELECT COUNT(*) as count FROM chat_messages')
    ]);
    
    // Get daily active users (last 7 days)
    const dauResult = await query(
      `SELECT DATE(last_active_at) as date, COUNT(*) as count
       FROM users
       WHERE last_active_at > CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(last_active_at)
       ORDER BY date`
    );
    
    // Get recent signups
    const recentSignups = await query(
      `SELECT id, email, first_name, last_name, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 10`
    );
    
    // Get top startups by matches
    const topStartups = await query(
      `SELECT s.name, COUNT(m.id) as match_count
       FROM startups s
       JOIN matches m ON s.id = m.startup_id
       GROUP BY s.id, s.name
       ORDER BY match_count DESC
       LIMIT 10`
    );
    
    res.json({
      stats: {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalSwipes: parseInt(swipesResult.rows[0].count),
        totalMatches: parseInt(matchesResult.rows[0].count),
        totalStartups: parseInt(startupsResult.rows[0].count),
        totalJobs: parseInt(jobsResult.rows[0].count),
        totalMessages: parseInt(messagesResult.rows[0].count)
      },
      dailyActiveUsers: dauResult.rows,
      recentSignups: recentSignups.rows,
      topStartups: topStartups.rows
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

export default router;