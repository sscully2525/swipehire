import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../index';

export interface Startup {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  description: string;
  mission?: string;
  stage: string;
  location?: string;
  remote_policy: string;
  size?: string;
  website?: string;
  linkedin_url?: string;
  founded_year?: number;
  funding_amount?: string;
  verified: boolean;
  featured: boolean;
}

export interface Job {
  id: string;
  startup_id: string;
  title: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  equity_min?: number;
  equity_max?: number;
  equity_vesting?: string;
  location?: string;
  remote_allowed: boolean;
  visa_sponsorship: boolean;
  employment_type: string;
  tech_stack?: string[];
  experience_level?: string;
  status: string;
  featured: boolean;
  views_count: number;
  applications_count: number;
  startup?: Startup;
}

export const createStartup = async (startup: Partial<Startup>, createdBy: string): Promise<Startup> => {
  const id = uuidv4();
  const slug = startup.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  const result = await query(
    `INSERT INTO startups (id, name, slug, description, stage, location, size, website, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, startup.name, slug, startup.description, startup.stage, startup.location, 
     startup.size, startup.website, createdBy]
  );
  
  return result.rows[0];
};

export const createJob = async (job: Partial<Job>): Promise<Job> => {
  const id = uuidv4();
  
  const result = await query(
    `INSERT INTO jobs (id, startup_id, title, description, requirements, responsibilities,
                       salary_min, salary_max, equity_min, equity_max, location, remote_allowed,
                       visa_sponsorship, employment_type, tech_stack, experience_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [id, job.startup_id, job.title, job.description, job.requirements, job.responsibilities,
     job.salary_min, job.salary_max, job.equity_min, job.equity_max, job.location,
     job.remote_allowed, job.visa_sponsorship, job.employment_type, job.tech_stack, job.experience_level]
  );
  
  return result.rows[0];
};

export const getJobsForSwiping = async (userId: string, filters?: any): Promise<Job[]> => {
  const cacheKey = `jobs:${userId}:${JSON.stringify(filters || {})}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  let sql = `
    SELECT j.*, s.name as startup_name, s.logo_url as startup_logo, 
           s.stage as startup_stage, s.location as startup_location,
           s.verified as startup_verified, s.slug as startup_slug
    FROM jobs j
    JOIN startups s ON j.startup_id = s.id
    WHERE j.status = 'active'
      AND j.id NOT IN (
        SELECT job_id FROM swipes WHERE user_id = $1
      )
  `;
  
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (filters?.remoteOnly) {
    sql += ` AND j.remote_allowed = true`;
  }
  
  if (filters?.minSalary) {
    sql += ` AND j.salary_max >= $${paramIndex}`;
    params.push(filters.minSalary);
    paramIndex++;
  }
  
  if (filters?.stages?.length) {
    sql += ` AND s.stage = ANY($${paramIndex})`;
    params.push(filters.stages);
    paramIndex++;
  }
  
  if (filters?.techStack?.length) {
    sql += ` AND j.tech_stack && $${paramIndex}`;
    params.push(filters.techStack);
    paramIndex++;
  }
  
  sql += ` ORDER BY j.featured DESC, j.created_at DESC LIMIT 50`;
  
  const result = await query(sql, params);
  
  // Cache for 5 minutes
  await redis.setEx(cacheKey, 300, JSON.stringify(result.rows));
  
  return result.rows;
};

export const getJobById = async (id: string): Promise<Job | null> => {
  const result = await query(
    `SELECT j.*, s.* 
     FROM jobs j
     JOIN startups s ON j.startup_id = s.id
     WHERE j.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    ...row,
    startup: {
      id: row.startup_id,
      name: row.name,
      slug: row.slug,
      logo_url: row.logo_url,
      description: row.description,
      stage: row.stage,
      location: row.location,
      verified: row.verified
    }
  };
};

export const incrementJobViews = async (jobId: string): Promise<void> => {
  await query('UPDATE jobs SET views_count = views_count + 1 WHERE id = $1', [jobId]);
};

export const seedStartupsAndJobs = async () => {
  const startups = [
    {
      name: 'NeonLabs',
      description: 'AI-powered code review and developer productivity tools that help teams ship faster with fewer bugs.',
      mission: 'Make every developer 10x more productive through AI assistance',
      stage: 'Series A',
      location: 'San Francisco, CA',
      size: '20-50',
      website: 'https://neonlabs.ai',
      founded_year: 2021,
      funding_amount: '$12M',
      jobs: [
        {
          title: 'Senior Full Stack Engineer',
          description: 'Build the future of AI-assisted development. You will architect and implement our core ML pipeline and developer tools.',
          requirements: ['5+ years experience', 'React/Node.js', 'Machine Learning basics', 'TypeScript'],
          responsibilities: ['Build ML infrastructure', 'Design APIs', 'Mentor junior engineers'],
          salary_min: 150000, salary_max: 200000,
          equity_min: 0.001, equity_max: 0.005,
          location: 'San Francisco, CA',
          remote_allowed: true,
          tech_stack: ['React', 'TypeScript', 'Python', 'TensorFlow', 'AWS', 'PostgreSQL'],
          experience_level: 'senior'
        },
        {
          title: 'ML Engineer',
          description: 'Develop and deploy large language models for code understanding and generation.',
          requirements: ['3+ years ML experience', 'PyTorch/TensorFlow', 'NLP background'],
          salary_min: 160000, salary_max: 220000,
          equity_min: 0.0015, equity_max: 0.006,
          tech_stack: ['Python', 'PyTorch', 'Transformers', 'AWS'],
          experience_level: 'senior'
        }
      ]
    },
    {
      name: 'GreenCart',
      description: 'Sustainable e-commerce platform connecting eco-conscious consumers with verified green products.',
      mission: 'Make sustainable shopping the default choice',
      stage: 'Seed',
      location: 'Austin, TX',
      size: '10-20',
      website: 'https://greencart.co',
      founded_year: 2022,
      funding_amount: '$3M',
      jobs: [
        {
          title: 'Product Designer',
          description: 'Design delightful shopping experiences that help people live more sustainably.',
          requirements: ['3+ years product design', 'Figma expert', 'E-commerce experience', 'User research'],
          salary_min: 100000, salary_max: 140000,
          equity_min: 0.002, equity_max: 0.008,
          remote_allowed: true,
          tech_stack: ['Figma', 'React', 'Shopify API'],
          experience_level: 'mid'
        }
      ]
    },
    {
      name: 'FinFlow',
      description: 'Automated bookkeeping and financial intelligence for freelancers and small businesses.',
      mission: 'Democratize financial management for the self-employed',
      stage: 'Series B',
      location: 'New York, NY',
      size: '50-100',
      website: 'https://finflow.com',
      founded_year: 2019,
      funding_amount: '$45M',
      verified: true,
      jobs: [
        {
          title: 'Backend Engineer',
          description: 'Scale our financial data pipeline to handle millions of transactions daily.',
          requirements: ['4+ years backend', 'Go or Rust', 'PostgreSQL', 'Distributed systems', 'AWS/GCP'],
          salary_min: 160000, salary_max: 220000,
          equity_min: 0.0005, equity_max: 0.002,
          location: 'New York, NY',
          remote_allowed: true,
          visa_sponsorship: true,
          tech_stack: ['Go', 'PostgreSQL', 'Redis', 'Kubernetes', 'GCP'],
          experience_level: 'senior'
        },
        {
          title: 'Staff Engineer',
          description: 'Lead technical architecture decisions and mentor the engineering team.',
          requirements: ['8+ years experience', 'System design', 'Team leadership'],
          salary_min: 200000, salary_max: 280000,
          equity_min: 0.001, equity_max: 0.003,
          tech_stack: ['Go', 'Kubernetes', 'Terraform'],
          experience_level: 'staff'
        }
      ]
    },
    {
      name: 'HealthSync',
      description: 'Remote patient monitoring and telehealth platform improving healthcare access.',
      mission: 'Healthcare should be accessible to everyone, everywhere',
      stage: 'Series A',
      location: 'Boston, MA',
      size: '30-60',
      website: 'https://healthsync.io',
      founded_year: 2020,
      funding_amount: '$18M',
      jobs: [
        {
          title: 'Mobile Engineer (iOS)',
          description: 'Build the primary interface between patients and their care teams.',
          requirements: ['iOS development', 'SwiftUI', 'HealthKit experience', 'HIPAA knowledge'],
          salary_min: 140000, salary_max: 190000,
          equity_min: 0.001, equity_max: 0.004,
          location: 'Boston, MA',
          remote_allowed: false,
          tech_stack: ['Swift', 'SwiftUI', 'HealthKit', 'Firebase'],
          experience_level: 'senior'
        }
      ]
    },
    {
      name: 'CryptoVault',
      description: 'Enterprise-grade crypto custody and wallet infrastructure for institutions.',
      mission: 'Secure the future of finance',
      stage: 'Series C',
      location: 'Remote',
      size: '100-200',
      website: 'https://cryptovault.io',
      founded_year: 2018,
      funding_amount: '$120M',
      verified: true,
      jobs: [
        {
          title: 'Security Engineer',
          description: 'Protect billions in digital assets. Design and implement secure systems.',
          requirements: ['Security background', 'Cryptography knowledge', 'Rust or Go', 'HSM experience'],
          salary_min: 180000, salary_max: 250000,
          equity_min: 0.0002, equity_max: 0.001,
          remote_allowed: true,
          tech_stack: ['Rust', 'Go', 'HSM', 'AWS', 'Custom hardware'],
          experience_level: 'senior'
        }
      ]
    },
    {
      name: 'EduSpark',
      description: 'Personalized learning platform for K-12 students using adaptive AI.',
      mission: 'Every student deserves a personalized education',
      stage: 'Seed',
      location: 'Denver, CO',
      size: '5-15',
      website: 'https://eduspark.io',
      founded_year: 2023,
      funding_amount: '$2M',
      jobs: [
        {
          title: 'Founding Engineer',
          description: 'Join as one of the first engineers. Shape the product and culture.',
          requirements: ['Full stack experience', 'Early-stage comfort', 'Education passion', 'React/Node'],
          salary_min: 120000, salary_max: 160000,
          equity_min: 0.01, equity_max: 0.03,
          location: 'Denver, CO',
          remote_allowed: true,
          tech_stack: ['Next.js', 'Node.js', 'PostgreSQL', 'Vercel', 'OpenAI'],
          experience_level: 'senior'
        }
      ]
    },
    {
      name: 'CloudNative',
      description: 'Developer platform for Kubernetes and cloud infrastructure management.',
      mission: 'Make cloud infrastructure accessible to all developers',
      stage: 'Series B',
      location: 'Seattle, WA',
      size: '80-150',
      website: 'https://cloudnative.dev',
      founded_year: 2019,
      funding_amount: '$35M',
      verified: true,
      jobs: [
        {
          title: 'Developer Advocate',
          description: 'Build the community and content that helps developers adopt our platform.',
          requirements: ['Technical writing', 'Public speaking', 'Kubernetes expertise', 'Community building'],
          salary_min: 130000, salary_max: 170000,
          equity_min: 0.0005, equity_max: 0.0015,
          remote_allowed: true,
          tech_stack: ['Kubernetes', 'Go', 'Terraform', 'YouTube/Twitch'],
          experience_level: 'mid'
        }
      ]
    },
    {
      name: 'FoodForward',
      description: 'AI-powered demand forecasting reducing food waste across the supply chain.',
      mission: 'Eliminate food waste through intelligent prediction',
      stage: 'Series A',
      location: 'Chicago, IL',
      size: '25-40',
      website: 'https://foodforward.ai',
      founded_year: 2020,
      funding_amount: '$15M',
      jobs: [
        {
          title: 'Data Scientist',
          description: 'Build ML models that predict food demand and prevent waste.',
          requirements: ['ML/DS experience', 'Python', 'Time series forecasting', 'SQL', '3+ years'],
          salary_min: 145000, salary_max: 195000,
          equity_min: 0.001, equity_max: 0.003,
          location: 'Chicago, IL',
          remote_allowed: true,
          tech_stack: ['Python', 'PyTorch', 'Apache Spark', 'Snowflake'],
          experience_level: 'senior'
        }
      ]
    },
    {
      name: 'SpaceLink',
      description: 'Satellite communication infrastructure connecting remote areas globally.',
      mission: 'Connect the unconnected',
      stage: 'Series B',
      location: 'Los Angeles, CA',
      size: '60-100',
      website: 'https://spacelink.com',
      founded_year: 2018,
      funding_amount: '$80M',
      jobs: [
        {
          title: 'Embedded Systems Engineer',
          description: 'Work on firmware for satellite ground stations and communication protocols.',
          requirements: ['Embedded C/C++', 'RTOS', 'Communication protocols', 'Hardware debugging'],
          salary_min: 155000, salary_max: 210000,
          equity_min: 0.0008, equity_max: 0.0025,
          location: 'Los Angeles, CA',
          remote_allowed: false,
          visa_sponsorship: true,
          tech_stack: ['C/C++', 'FreeRTOS', 'Linux', 'Custom hardware'],
          experience_level: 'senior'
        }
      ]
    },
    {
      name: 'MindfulApp',
      description: 'Mental health and wellness platform for modern workplaces.',
      mission: 'Make mental health support accessible at work',
      stage: 'Seed',
      location: 'Remote',
      size: '8-15',
      website: 'https://mindfulapp.io',
      founded_year: 2022,
      funding_amount: '$4M',
      jobs: [
        {
          title: 'Growth Engineer',
          description: 'Own user acquisition and retention. Experiment, measure, scale.',
          requirements: ['Growth/marketing engineering', 'Analytics', 'A/B testing', 'SQL', 'React'],
          salary_min: 110000, salary_max: 150000,
          equity_min: 0.003, equity_max: 0.008,
          remote_allowed: true,
          tech_stack: ['React', 'Node.js', 'Segment', 'Amplitude', 'HubSpot'],
          experience_level: 'mid'
        }
      ]
    }
  ];

  for (const startupData of startups) {
    const { jobs, ...startupInfo } = startupData;
    const startupId = uuidv4();
    const slug = startupInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    await query(
      `INSERT INTO startups (id, name, slug, description, mission, stage, location, size, 
                            website, founded_year, funding_amount, verified, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (slug) DO NOTHING`,
      [startupId, startupInfo.name, slug, startupInfo.description, startupInfo.mission,
       startupInfo.stage, startupInfo.location, startupInfo.size, startupInfo.website,
       startupInfo.founded_year, startupInfo.funding_amount, startupInfo.verified || false, 
       Math.random() > 0.7] // 30% featured
    );
    
    // Get the startup ID (might be different if conflict)
    const startupResult = await query('SELECT id FROM startups WHERE slug = $1', [slug]);
    if (startupResult.rows.length === 0) continue;
    
    const actualStartupId = startupResult.rows[0].id;
    
    for (const job of jobs) {
      const jobId = uuidv4();
      await query(
        `INSERT INTO jobs (id, startup_id, title, description, requirements, responsibilities,
                           salary_min, salary_max, equity_min, equity_max, location, 
                           remote_allowed, visa_sponsorship, tech_stack, experience_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT DO NOTHING`,
        [jobId, actualStartupId, job.title, job.description, job.requirements, 
         (job as any).responsibilities || [], job.salary_min, job.salary_max, job.equity_min, 
         job.equity_max, (job as any).location || startupInfo.location, job.remote_allowed, 
         (job as any).visa_sponsorship || false,
         job.tech_stack, job.experience_level]
      );
    }
  }
  
  console.log('✅ Seeded startups and jobs with rich data');
};