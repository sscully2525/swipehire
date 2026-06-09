import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { generateTokens, storeRefreshToken, findUserByEmail } from '../models/user';
import { authenticate, requireAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';

const router = Router();

// All /api/setup routes require a setup token (X-Setup-Token header) that matches
// SETUP_TOKEN env var. In production, refuse if SETUP_TOKEN is unset.
const requireSetupToken = (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const expected = process.env.SETUP_TOKEN;
  if (isProd && !expected) {
    return res.status(503).json({ error: 'Setup endpoints disabled (SETUP_TOKEN not configured)' });
  }
  if (expected) {
    const provided = req.headers['x-setup-token'];
    if (provided !== expected) {
      return res.status(401).json({ error: 'Invalid or missing setup token' });
    }
  }
  // In non-prod with no token set, allow (dev convenience)
  next();
};

router.use(requireSetupToken);

// `authenticate` and `requireAdmin` are imported from ../middleware/auth
// (shared with every other route) rather than redefined here.

// Only available outside production
const devOnly = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
};

// Sample companies data
const SAMPLE_COMPANIES = [
  { name: 'TechFlow', slug: 'techflow', description: 'AI-powered workflow automation platform', mission: 'Making work effortless through intelligent automation', stage: 'Series B', location: 'San Francisco, CA', size: '50-200', website: 'https://techflow.io' },
  { name: 'CloudNine', slug: 'cloudnine', description: 'Cloud infrastructure management for modern teams', mission: 'Simplifying cloud complexity', stage: 'Series A', location: 'Seattle, WA', size: '20-50', website: 'https://cloudnine.dev' },
  { name: 'DataPulse', slug: 'datapulse', description: 'Real-time analytics and data visualization', mission: 'Turning data into decisions', stage: 'Seed', location: 'Austin, TX', size: '10-20', website: 'https://datapulse.io' },
  { name: 'SecureNet', slug: 'securenet', description: 'Enterprise cybersecurity solutions', mission: 'Protecting the digital frontier', stage: 'Series C', location: 'Boston, MA', size: '200-500', website: 'https://securenet.com' },
  { name: 'GreenEnergy', slug: 'greenenergy', description: 'Sustainable energy management platform', mission: 'Powering a cleaner future', stage: 'Series A', location: 'Denver, CO', size: '20-50', website: 'https://greenenergy.io' },
  { name: 'HealthSync', slug: 'healthsync', description: 'Digital health records and patient management', mission: 'Connecting healthcare for better outcomes', stage: 'Series B', location: 'New York, NY', size: '50-200', website: 'https://healthsync.co' },
  { name: 'FinTech Pro', slug: 'fintech-pro', description: 'Modern banking infrastructure', mission: 'Democratizing financial services', stage: 'Series C', location: 'Miami, FL', size: '200-500', website: 'https://fintechpro.com' },
  { name: 'EduLearn', slug: 'edulearn', description: 'Online learning platform for professionals', mission: 'Lifelong learning for everyone', stage: 'Series A', location: 'Chicago, IL', size: '20-50', website: 'https://edulearn.io' },
  { name: 'Logistics AI', slug: 'logistics-ai', description: 'AI-powered supply chain optimization', mission: 'Moving the world efficiently', stage: 'Series B', location: 'Atlanta, GA', size: '50-200', website: 'https://logisticsai.com' },
  { name: 'RetailTech', slug: 'retailtech', description: 'Omnichannel retail management platform', mission: 'Reimagining retail experiences', stage: 'Series A', location: 'Los Angeles, CA', size: '20-50', website: 'https://retailtech.io' },
  { name: 'MediaStream', slug: 'mediastream', description: 'Video streaming infrastructure', mission: 'Delivering content seamlessly', stage: 'Series C', location: 'San Francisco, CA', size: '200-500', website: 'https://mediastream.io' },
  { name: 'DevTools Co', slug: 'devtools-co', description: 'Developer productivity tools', mission: 'Empowering developers worldwide', stage: 'Seed', location: 'Portland, OR', size: '10-20', website: 'https://devtools.co' },
  { name: 'CryptoVault', slug: 'cryptovault', description: 'Secure cryptocurrency custody solutions', mission: 'Securing digital assets', stage: 'Series B', location: 'New York, NY', size: '50-200', website: 'https://cryptovault.io' },
  { name: 'SmartCity', slug: 'smartcity', description: 'Urban planning and IoT solutions', mission: 'Building cities of tomorrow', stage: 'Series A', location: 'Phoenix, AZ', size: '20-50', website: 'https://smartcity.io' },
  { name: 'AgriTech', slug: 'agritech', description: 'Precision agriculture technology', mission: 'Feeding the world sustainably', stage: 'Seed', location: 'Des Moines, IA', size: '10-20', website: 'https://agritech.io' },
  { name: 'SpaceXplore', slug: 'spacexplore', description: 'Satellite data and space analytics', mission: 'Unlocking space data for Earth', stage: 'Series B', location: 'Houston, TX', size: '50-200', website: 'https://spacexplore.io' },
  { name: 'BioGen', slug: 'biogen-tech', description: 'Biotechnology research platform', mission: 'Accelerating life sciences', stage: 'Series C', location: 'San Diego, CA', size: '200-500', website: 'https://biogen.io' },
  { name: 'LegalTech', slug: 'legaltech', description: 'AI-powered legal document analysis', mission: 'Democratizing legal services', stage: 'Series A', location: 'Washington, DC', size: '20-50', website: 'https://legaltech.io' },
  { name: 'GameStudio', slug: 'gamestudio', description: 'Indie game development platform', mission: 'Creating worlds of wonder', stage: 'Seed', location: 'Austin, TX', size: '10-20', website: 'https://gamestudio.io' },
  { name: 'MusicAI', slug: 'musicai', description: 'AI music composition and production', mission: 'Amplifying human creativity', stage: 'Series A', location: 'Nashville, TN', size: '20-50', website: 'https://musicai.io' },
  { name: 'TravelTech', slug: 'traveltech', description: 'Personalized travel planning platform', mission: 'Making travel magical', stage: 'Series B', location: 'Denver, CO', size: '50-200', website: 'https://traveltech.io' },
  { name: 'FoodDelivery', slug: 'fooddelivery', description: 'Restaurant logistics and delivery', mission: 'Connecting hungry people with great food', stage: 'Series C', location: 'Chicago, IL', size: '200-500', website: 'https://fooddelivery.io' },
  { name: 'RealEstate AI', slug: 'realestate-ai', description: 'Property valuation and investment analytics', mission: 'Smart real estate decisions', stage: 'Series A', location: 'Miami, FL', size: '20-50', website: 'https://realestateai.io' },
  { name: 'FashionTech', slug: 'fashiontech', description: 'Sustainable fashion marketplace', mission: 'Fashion without footprint', stage: 'Seed', location: 'New York, NY', size: '10-20', website: 'https://fashiontech.io' },
  { name: 'SportsTech', slug: 'sportstech', description: 'Athlete performance analytics', mission: 'Unlocking human potential', stage: 'Series A', location: 'Los Angeles, CA', size: '20-50', website: 'https://sportstech.io' },
  { name: 'NewsMedia', slug: 'newsmedia', description: 'AI-curated news platform', mission: 'Informing the world intelligently', stage: 'Series B', location: 'San Francisco, CA', size: '50-200', website: 'https://newsmedia.io' },
  { name: 'JobMatch', slug: 'jobmatch', description: 'AI-powered recruitment platform', mission: 'Matching talent with opportunity', stage: 'Series A', location: 'Seattle, WA', size: '20-50', website: 'https://jobmatch.io' },
  { name: 'EventTech', slug: 'eventtech', description: 'Virtual and hybrid event platform', mission: 'Bringing people together', stage: 'Series B', location: 'Las Vegas, NV', size: '50-200', website: 'https://eventtech.io' },
  { name: 'AutoDrive', slug: 'autodrive', description: 'Autonomous vehicle software', mission: 'Safer roads through autonomy', stage: 'Series C', location: 'Pittsburgh, PA', size: '200-500', website: 'https://autodrive.io' },
  { name: 'DroneTech', slug: 'dronetech', description: 'Commercial drone operations', mission: 'Taking business to new heights', stage: 'Series A', location: 'Reno, NV', size: '20-50', website: 'https://dronetech.io' },
  { name: 'Robotics Co', slug: 'robotics-co', description: 'Industrial automation robots', mission: 'Building the workforce of tomorrow', stage: 'Series B', location: 'Boston, MA', size: '50-200', website: 'https://robotics.co' },
  { name: 'VoiceAI', slug: 'voiceai', description: 'Voice synthesis and recognition', mission: 'Giving machines a voice', stage: 'Seed', location: 'San Francisco, CA', size: '10-20', website: 'https://voiceai.io' },
  { name: 'ChatBot Pro', slug: 'chatbot-pro', description: 'Enterprise conversational AI', mission: 'Conversations that convert', stage: 'Series A', location: 'New York, NY', size: '20-50', website: 'https://chatbotpro.io' },
  { name: 'CodeAssist', slug: 'codeassist', description: 'AI pair programming assistant', mission: 'Coding at the speed of thought', stage: 'Series B', location: 'Seattle, WA', size: '50-200', website: 'https://codeassist.io' },
  { name: 'DesignAI', slug: 'designai', description: 'Generative design platform', mission: 'Designing the future', stage: 'Seed', location: 'Portland, OR', size: '10-20', website: 'https://designai.io' },
  { name: 'Marketing Pro', slug: 'marketing-pro', description: 'AI marketing automation', mission: 'Marketing that matters', stage: 'Series A', location: 'Austin, TX', size: '20-50', website: 'https://marketingpro.io' },
  { name: 'SalesTech', slug: 'salestech', description: 'Sales intelligence and CRM', mission: 'Closing deals faster', stage: 'Series B', location: 'Denver, CO', size: '50-200', website: 'https://salestech.io' },
  { name: 'SupportHub', slug: 'supporthub', description: 'Customer support automation', mission: 'Support that scales', stage: 'Series A', location: 'Phoenix, AZ', size: '20-50', website: 'https://supporthub.io' },
  { name: 'HR Tech', slug: 'hr-tech', description: 'Human resources management', mission: 'People-first HR', stage: 'Seed', location: 'Chicago, IL', size: '10-20', website: 'https://hrtech.io' },
  { name: 'Payroll Pro', slug: 'payroll-pro', description: 'Automated payroll processing', mission: 'Paying people perfectly', stage: 'Series A', location: 'Atlanta, GA', size: '20-50', website: 'https://payrollpro.io' },
  { name: 'Inventory AI', slug: 'inventory-ai', description: 'Smart inventory management', mission: 'Never run out, never overstock', stage: 'Series B', location: 'Dallas, TX', size: '50-200', website: 'https://inventoryai.io' },
  { name: 'Quality Control', slug: 'quality-control', description: 'Automated quality assurance', mission: 'Quality at scale', stage: 'Seed', location: 'Detroit, MI', size: '10-20', website: 'https://qualitycontrol.io' },
  { name: 'Manufacturing AI', slug: 'manufacturing-ai', description: 'Smart factory solutions', mission: 'Building smarter factories', stage: 'Series A', location: 'Cleveland, OH', size: '20-50', website: 'https://manufacturingai.io' },
  { name: 'Supply Chain Pro', slug: 'supply-chain-pro', description: 'End-to-end supply chain visibility', mission: 'Supply chains that never break', stage: 'Series B', location: 'Memphis, TN', size: '50-200', website: 'https://supplychainpro.io' },
  { name: 'Warehouse Tech', slug: 'warehouse-tech', description: 'Automated warehouse operations', mission: 'Fulfilling the future', stage: 'Series A', location: 'Louisville, KY', size: '20-50', website: 'https://warehousetech.io' },
  { name: 'Fleet Management', slug: 'fleet-management', description: 'Vehicle fleet optimization', mission: 'Moving fleets forward', stage: 'Seed', location: 'Charlotte, NC', size: '10-20', website: 'https://fleetmanagement.io' },
  { name: 'Insurance Tech', slug: 'insurance-tech', description: 'Digital insurance platform', mission: 'Insurance made simple', stage: 'Series A', location: 'Hartford, CT', size: '20-50', website: 'https://insurancetech.io' },
  { name: 'Banking API', slug: 'banking-api', description: 'Open banking infrastructure', mission: 'Banking for the digital age', stage: 'Series B', location: 'San Francisco, CA', size: '50-200', website: 'https://bankingapi.io' },
  { name: 'Investment AI', slug: 'investment-ai', description: 'AI-powered investment management', mission: 'Wealth for everyone', stage: 'Series C', location: 'New York, NY', size: '200-500', website: 'https://investmentai.io' },
  { name: 'Credit Score', slug: 'credit-score', description: 'Alternative credit scoring', mission: 'Fair credit for all', stage: 'Series A', location: 'Los Angeles, CA', size: '20-50', website: 'https://creditscore.io' },
  { name: 'Blockchain Co', slug: 'blockchain-co', description: 'Enterprise blockchain solutions', mission: 'Trust through technology', stage: 'Series B', location: 'Miami, FL', size: '50-200', website: 'https://blockchain.co' }
];

const JOB_TITLES = [
  'Senior Full Stack Engineer', 'Frontend Developer', 'Backend Engineer', 'DevOps Engineer',
  'Product Manager', 'UX Designer', 'Data Scientist', 'Machine Learning Engineer',
  'Mobile Developer', 'Security Engineer', 'Cloud Architect', 'Engineering Manager',
  'Technical Lead', 'QA Engineer', 'Site Reliability Engineer', 'Data Engineer',
  'Product Designer', 'Growth Engineer', 'Platform Engineer', 'AI Research Scientist'
];

const TECH_STACKS = [
  ['React', 'Node.js', 'PostgreSQL', 'AWS'],
  ['Python', 'Django', 'Redis', 'Docker'],
  ['Vue.js', 'Go', 'MongoDB', 'Kubernetes'],
  ['Angular', 'Java', 'MySQL', 'GCP'],
  ['React Native', 'TypeScript', 'Firebase'],
  ['Swift', 'iOS', 'CoreData'],
  ['Kotlin', 'Android', 'Room'],
  ['Rust', 'WebAssembly', 'PostgreSQL'],
  ['Ruby on Rails', 'React', 'AWS'],
  ['PHP', 'Laravel', 'Vue.js', 'MySQL']
];

async function seedCompanies(): Promise<number> {
  let createdCount = 0;
  for (const company of SAMPLE_COMPANIES) {
    try {
      const startupId = uuidv4();
      await query(
        `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, website, verified, featured, created_by, is_demo, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, 'demo')
         ON CONFLICT (slug) DO NOTHING`,
        [startupId, company.name, company.slug, company.description, company.mission,
         company.stage, company.location, company.size, company.website,
         true, Math.random() > 0.7, null]
      );

      // Only create jobs if the startup was actually inserted
      const inserted = await query('SELECT id FROM startups WHERE slug = $1', [company.slug]);
      if (inserted.rows.length === 0) continue;
      const actualStartupId = inserted.rows[0].id;

      const existingJobs = await query('SELECT COUNT(*) as count FROM jobs WHERE startup_id = $1', [actualStartupId]);
      if (parseInt(existingJobs.rows[0].count) > 0) { createdCount++; continue; }

      const numJobs = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numJobs; i++) {
        const jobId = uuidv4();
        const title = JOB_TITLES[Math.floor(Math.random() * JOB_TITLES.length)];
        const techStack = TECH_STACKS[Math.floor(Math.random() * TECH_STACKS.length)];
        const salaryMin = 80000 + Math.floor(Math.random() * 50000);
        const salaryMax = salaryMin + 40000 + Math.floor(Math.random() * 60000);
        const equityMin = 0.001 + Math.random() * 0.009;
        const equityMax = equityMin + 0.005 + Math.random() * 0.01;
        await query(
          `INSERT INTO jobs (id, startup_id, title, description, salary_min, salary_max, equity_min, equity_max, location, remote_allowed, tech_stack, experience_level, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')`,
          [jobId, actualStartupId, title,
           `Join ${company.name} as a ${title}. Work on cutting-edge technology in a fast-paced environment.`,
           salaryMin, salaryMax, equityMin, equityMax, company.location,
           Math.random() > 0.3,
           techStack,
           ['junior', 'mid', 'senior'][Math.floor(Math.random() * 3)]]
        );
      }
      createdCount++;
    } catch (err) {
      logger.warn({ company: company.name, err: (err as Error).message }, 'Skipped company during seed');
    }
  }
  return createdCount;
}

// Create admin account — requires existing admin or dev-only
router.post('/setup-admin', devOnly, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingAdmin = await query("SELECT id FROM users WHERE email = $1 AND role = 'admin'", [email]);
    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({ error: 'Admin already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5, 'admin', true, true)`,
      [id, email, passwordHash, firstName, lastName]
    );
    res.json({ message: 'Admin created successfully', userId: id });
  } catch (error) {
    logger.error({ err: error, userId: (req as any).userId }, 'Setup admin error');
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Seed admin with demo company — requires existing admin or dev-only
router.post('/seed-admin-company', devOnly, async (req, res) => {
  try {
    const { adminEmail } = req.body;
    const adminResult = await query("SELECT id FROM users WHERE email = $1 AND role = 'admin'", [adminEmail]);
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const adminId = adminResult.rows[0].id;
    const startupId = uuidv4();
    await query(
      `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, website, verified, featured, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (slug) DO NOTHING`,
      [startupId, 'Grand Ventures', 'grand-ventures',
       'A cutting-edge technology company building the future of AI-powered solutions.',
       'Empowering businesses through intelligent automation',
       'Series A', 'New York, NY', '20-50', 'https://grandventures.io', true, true, adminId]
    );

    const sv = await query('SELECT id FROM startups WHERE slug = $1', ['grand-ventures']);
    const actualId = sv.rows[0]?.id;
    if (!actualId) return res.status(500).json({ error: 'Startup insert failed' });

    const jobs = [
      { title: 'Senior Full Stack Engineer', description: 'Lead our engineering team in building scalable AI solutions.', salary_min: 180000, salary_max: 250000, equity_min: 0.005, equity_max: 0.015, tech_stack: ['React', 'Node.js', 'Python', 'AWS', 'PostgreSQL'], experience_level: 'senior' },
      { title: 'Product Designer', description: 'Design intuitive interfaces for our AI platform.', salary_min: 130000, salary_max: 180000, equity_min: 0.003, equity_max: 0.008, tech_stack: ['Figma', 'React', 'Design Systems'], experience_level: 'senior' },
      { title: 'Machine Learning Engineer', description: 'Build and deploy ML models at scale.', salary_min: 200000, salary_max: 300000, equity_min: 0.008, equity_max: 0.02, tech_stack: ['Python', 'PyTorch', 'TensorFlow', 'AWS', 'Kubernetes'], experience_level: 'senior' }
    ];
    for (const job of jobs) {
      await query(
        `INSERT INTO jobs (id, startup_id, title, description, salary_min, salary_max, equity_min, equity_max, location, remote_allowed, tech_stack, experience_level, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')`,
        [uuidv4(), actualId, job.title, job.description, job.salary_min, job.salary_max,
         job.equity_min, job.equity_max, 'New York, NY', true, job.tech_stack, job.experience_level]
      );
    }
    res.json({ message: 'Admin company seeded successfully', startupId: actualId });
  } catch (error) {
    logger.error({ err: error, userId: (req as any).userId }, 'Seed admin company error');
    res.status(500).json({ error: 'Failed to seed admin company' });
  }
});

// Seed sample companies — dev-only and protected by the setup token middleware.
router.get('/seed-sample-companies', devOnly, async (req, res) => {
  try {
    const existingCount = await query('SELECT COUNT(*) as count FROM startups');
    if (parseInt(existingCount.rows[0].count) > 1) {
      return res.json({ message: 'Sample companies already seeded', count: existingCount.rows[0].count });
    }
    const createdCount = await seedCompanies();
    res.json({ message: `Successfully created ${createdCount} sample companies with jobs`, count: createdCount });
  } catch (error) {
    logger.error({ err: error, userId: (req as any).userId }, 'Seed sample companies error');
    res.status(500).json({ error: 'Failed to seed sample companies' });
  }
});

// POST alias for seed — dev-only and protected by the setup token middleware.
router.post('/seed-sample-companies', devOnly, async (req, res) => {
  try {
    const createdCount = await seedCompanies();
    res.json({ message: `Successfully created ${createdCount} sample companies with jobs`, count: createdCount });
  } catch (error) {
    logger.error({ err: error, userId: (req as any).userId }, 'Seed sample companies error');
    res.status(500).json({ error: 'Failed to seed sample companies' });
  }
});

// Admin dashboard stats — admin only
router.get('/admin-stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [usersResult, swipesResult, matchesResult, startupsResult, jobsResult, messagesResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM swipes'),
      query('SELECT COUNT(*) as count FROM matches'),
      query('SELECT COUNT(*) as count FROM startups'),
      query('SELECT COUNT(*) as count FROM jobs'),
      query('SELECT COUNT(*) as count FROM chat_messages')
    ]);
    const dauResult = await query(
      `SELECT DATE(last_active_at) as date, COUNT(*) as count
       FROM users WHERE last_active_at > CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(last_active_at) ORDER BY date`
    );
    const recentSignups = await query(
      `SELECT id, email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT 10`
    );
    const topStartups = await query(
      `SELECT s.name, COUNT(m.id) as match_count FROM startups s
       JOIN matches m ON s.id = m.startup_id
       GROUP BY s.id, s.name ORDER BY match_count DESC LIMIT 10`
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
    logger.error({ err: error, userId: (req as any).userId }, 'Admin stats error');
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Clear swipes — dev only (testing utility)
router.post('/clear-swipes', devOnly, authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = userId || (req as any).userId;
    await query('DELETE FROM swipes WHERE user_id = $1', [targetId]);
    res.json({ message: 'Swipes cleared' });
  } catch (error) {
    logger.error({ err: error, userId: (req as any).userId }, 'Clear swipes error');
    res.status(500).json({ error: 'Failed to clear swipes' });
  }
});

// ─── Dev-login: instant login without password (dev only) ────────────────────
router.post('/dev-login', devOnly, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: `No user with email: ${email}` });

    const tokens = generateTokens(user.id);
    await storeRefreshToken(user.id, tokens.refreshToken);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: (user as any).role,
        title: user.title,
        dailySwipes: user.daily_swipes,
        subscriptionTier: user.subscription_tier,
        onboardingCompleted: user.onboarding_completed,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Dev-login error');
    res.status(500).json({ error: 'Dev login failed' });
  }
});

// ─── Nuke + reseed: wipe all users and recreate test accounts ─────────────────
const TEST_ACCOUNTS = [
  {
    email: 'sean@swipehire.com',
    password: 'admin12345',
    firstName: 'Sean',
    lastName: 'Scully',
    role: 'admin',
    title: 'Founder & CEO',
    onboarded: true,
  },
  {
    email: 'recruiter@test.com',
    password: 'test123456',
    firstName: 'Alex',
    lastName: 'Recruiter',
    role: 'recruiter',
    title: 'Head of Talent',
    onboarded: true,
  },
  {
    email: 'alice@test.com',
    password: 'test123456',
    firstName: 'Alice',
    lastName: 'Chen',
    role: 'candidate',
    title: 'Senior Full Stack Engineer',
    onboarded: true,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
    yearsExp: 6,
    salaryMin: 160000,
    salaryMax: 220000,
    remote: 'remote',
    bio: 'Passionate full-stack engineer with 6 years building scalable web apps. Love React and distributed systems.',
  },
  {
    email: 'bob@test.com',
    password: 'test123456',
    firstName: 'Bob',
    lastName: 'Martinez',
    role: 'candidate',
    title: 'Machine Learning Engineer',
    onboarded: true,
    skills: ['Python', 'PyTorch', 'TensorFlow', 'AWS', 'Kubernetes'],
    yearsExp: 4,
    salaryMin: 180000,
    salaryMax: 260000,
    remote: 'hybrid',
    bio: 'ML engineer specializing in NLP and computer vision. Previously at Google Brain.',
  },
  {
    email: 'carol@test.com',
    password: 'test123456',
    firstName: 'Carol',
    lastName: 'Kim',
    role: 'candidate',
    title: 'Product Designer',
    onboarded: true,
    skills: ['Figma', 'React', 'Design Systems', 'Prototyping', 'User Research'],
    yearsExp: 5,
    salaryMin: 130000,
    salaryMax: 180000,
    remote: 'remote',
    bio: 'Product designer who codes. I bridge design and engineering to ship beautiful, functional products.',
  },
];

router.post('/nuke-and-seed', devOnly, async (req: Request, res: Response) => {
  try {
    logger.warn('🔴 nuke-and-seed called — wiping all user data');

    // Wipe everything user-related (cascade handles dependent tables)
    await query('DELETE FROM chat_messages');
    await query('DELETE FROM notifications');
    await query('DELETE FROM matches');
    await query('DELETE FROM recruiter_swipes');
    await query('DELETE FROM swipes');
    await query('DELETE FROM subscriptions');
    // Delete non-demo startups
    await query("DELETE FROM jobs WHERE startup_id IN (SELECT id FROM startups WHERE is_demo = false OR is_demo IS NULL)");
    await query("DELETE FROM startups WHERE is_demo = false OR is_demo IS NULL");
    await query('DELETE FROM users');

    const created: any[] = [];

    // Create test users
    for (const acct of TEST_ACCOUNTS) {
      const id = uuidv4();
      const hash = await bcrypt.hash(acct.password, 10);
      await query(
        `INSERT INTO users (
           id, email, password_hash, first_name, last_name, role,
           title, bio, skills, years_experience,
           preferred_salary_min, preferred_salary_max,
           remote_preference, email_verified, onboarding_completed,
           subscription_tier, daily_swipes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,'free',10)`,
        [
          id, acct.email, hash, acct.firstName, acct.lastName, acct.role,
          acct.title ?? null,
          (acct as any).bio ?? null,
          (acct as any).skills ? `{${(acct as any).skills.join(',')}}` : null,
          (acct as any).yearsExp ?? null,
          (acct as any).salaryMin ?? null,
          (acct as any).salaryMax ?? null,
          (acct as any).remote ?? null,
          acct.onboarded,
        ]
      );
      created.push({ id, email: acct.email, role: acct.role, password: acct.password });
    }

    // Create recruiter's company + jobs
    const recruiterRow = await query("SELECT id FROM users WHERE email = 'recruiter@test.com'");
    const recruiterId = recruiterRow.rows[0].id;
    const companyId = uuidv4();
    await query(
      `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, website, verified, featured, created_by, is_demo, source)
       VALUES ($1,'Gigly Labs','swipehire-labs',
         'The company behind Gigly — building the future of recruiting.',
         'Match every great candidate with their perfect startup.',
         'Series A','San Francisco, CA','20-50','https://swipehire.com',
         true, true, $2, false, 'user')`,
      [companyId, recruiterId]
    );
    const testJobs = [
      { title: 'Senior Full Stack Engineer', desc: 'Lead our web platform development.', smin: 180000, smax: 250000, stack: ['React','Node.js','TypeScript','PostgreSQL','AWS'], level: 'senior' },
      { title: 'ML Engineer', desc: 'Build our AI matching engine.', smin: 200000, smax: 300000, stack: ['Python','PyTorch','AWS','Kubernetes'], level: 'senior' },
      { title: 'Product Designer', desc: 'Design the candidate and recruiter experience.', smin: 130000, smax: 180000, stack: ['Figma','React','Design Systems'], level: 'mid' },
    ];
    for (const j of testJobs) {
      await query(
        `INSERT INTO jobs (id, startup_id, title, description, salary_min, salary_max, location, remote_allowed, tech_stack, experience_level, status)
         VALUES ($1,$2,$3,$4,$5,$6,'San Francisco, CA',true,$7,$8,'active')`,
        [uuidv4(), companyId, j.title, j.desc, j.smin, j.smax, `{${j.stack.join(',')}}`, j.level]
      );
    }

    // Create admin's company + sample priced gigs, so the admin account can
    // post/review gigs immediately ("Failed to create gig" was a 400 from
    // owning no company).
    const adminRow = await query("SELECT id FROM users WHERE email = 'sean@swipehire.com'");
    if (adminRow.rows.length > 0) {
      const adminCompanyId = uuidv4();
      await query(
        `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, website, verified, featured, created_by, is_demo, source)
         VALUES ($1,'Sean''s Studio','seans-studio',
           'Sean''s gig posting workspace for testing the client side.',
           'Ship great gigs fast.',
           'Seed','Remote','1-10','https://gigly.example',
           true, false, $2, false, 'user')`,
        [adminCompanyId, adminRow.rows[0].id]
      );
      const testGigs = [
        { title: 'Build a marketing landing page', desc: 'One-page React site, mobile-first, deployed to Vercel.', type: 'fixed', bmin: 500, bmax: 1500, dur: '2 weeks', stack: ['React', 'Tailwind'] },
        { title: 'Fix flaky Playwright tests', desc: 'Stabilize our e2e suite, ~12 flaky specs.', type: 'hourly', bmin: 50, bmax: 90, dur: '10 hours', stack: ['Playwright', 'TypeScript'] },
      ];
      for (const g of testGigs) {
        await query(
          `INSERT INTO jobs (id, startup_id, title, description, pricing_type, budget_min, budget_max, estimated_duration, location, remote_allowed, tech_stack, employment_type, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Remote',true,$9,'contract','active')`,
          [uuidv4(), adminCompanyId, g.title, g.desc, g.type, g.bmin, g.bmax, g.dur, `{${g.stack.join(',')}}`]
        );
      }
    }

    // Seed demo companies
    await seedCompanies();

    logger.info({ accounts: created.map(c => c.email) }, '✅ nuke-and-seed complete');
    res.json({
      message: '✅ Database wiped and reseeded',
      accounts: created,
      tip: 'Use POST /api/setup/dev-login with { email } for instant login (no password needed)',
    });
  } catch (err) {
    logger.error({ err }, 'nuke-and-seed error');
    res.status(500).json({ error: 'nuke-and-seed failed', detail: (err as Error).message });
  }
});

export default router;
