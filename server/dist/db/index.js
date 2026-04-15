"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = exports.getClient = exports.query = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Use DATABASE_URL if available (Railway provides this), otherwise use individual vars
const pool = process.env.DATABASE_URL
    ? new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    })
    : new pg_1.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'swipehire',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
const query = (text, params) => pool.query(text, params);
exports.query = query;
const getClient = () => pool.connect();
exports.getClient = getClient;
const initDB = async () => {
    try {
        // Test connection first
        const testClient = await pool.connect();
        await testClient.query('SELECT 1');
        testClient.release();
        console.log('✅ Database connected');
        // Create tables one by one with error handling
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        title VARCHAR(200),
        bio TEXT,
        skills TEXT[],
        linkedin_url VARCHAR(500),
        github_url VARCHAR(500),
        portfolio_url VARCHAR(500),
        resume_url VARCHAR(500),
        avatar_url VARCHAR(500),
        video_intro_url VARCHAR(500),
        location VARCHAR(200),
        years_experience INTEGER,
        preferred_salary_min INTEGER,
        preferred_salary_max INTEGER,
        remote_preference VARCHAR(50) DEFAULT 'hybrid',
        daily_swipes INTEGER DEFAULT 10,
        subscription_tier VARCHAR(50) DEFAULT 'free',
        subscription_expires_at TIMESTAMP,
        email_verified BOOLEAN DEFAULT FALSE,
        linkedin_verified BOOLEAN DEFAULT FALSE,
        identity_verified BOOLEAN DEFAULT FALSE,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        role VARCHAR(50) DEFAULT 'candidate',
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Startups table
            `CREATE TABLE IF NOT EXISTS startups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        logo_url VARCHAR(500),
        cover_image_url VARCHAR(500),
        description TEXT NOT NULL,
        mission TEXT,
        stage VARCHAR(50) NOT NULL,
        location VARCHAR(200),
        remote_policy VARCHAR(50) DEFAULT 'hybrid',
        size VARCHAR(50),
        website VARCHAR(500),
        linkedin_url VARCHAR(500),
        founded_year INTEGER,
        funding_amount VARCHAR(100),
        verified BOOLEAN DEFAULT FALSE,
        featured BOOLEAN DEFAULT FALSE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Jobs table
            `CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT[],
        responsibilities TEXT[],
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency VARCHAR(3) DEFAULT 'USD',
        equity_min DECIMAL(5,4),
        equity_max DECIMAL(5,4),
        equity_vesting VARCHAR(100),
        location VARCHAR(200),
        remote_allowed BOOLEAN DEFAULT TRUE,
        visa_sponsorship BOOLEAN DEFAULT FALSE,
        employment_type VARCHAR(50) DEFAULT 'full-time',
        tech_stack TEXT[],
        experience_level VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        featured BOOLEAN DEFAULT FALSE,
        views_count INTEGER DEFAULT 0,
        applications_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Swipes table
            `CREATE TABLE IF NOT EXISTS swipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right')),
        ai_match_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, job_id)
      )`,
            // Matches table
            `CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        user_interest_level INTEGER CHECK (user_interest_level BETWEEN 1 AND 5),
        company_interest_level INTEGER CHECK (company_interest_level BETWEEN 1 AND 5),
        scheduled_call_at TIMESTAMP,
        call_link VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, job_id)
      )`,
            // Chat messages table
            `CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('candidate', 'company')),
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
        file_url VARCHAR(500),
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Notifications table
            `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Subscriptions table
            `CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        tier VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Analytics events table
            `CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        session_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Work Experience table
            `CREATE TABLE IF NOT EXISTS work_experience (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(200) NOT NULL,
        title VARCHAR(200) NOT NULL,
        location VARCHAR(200),
        start_date DATE NOT NULL,
        end_date DATE,
        is_current BOOLEAN DEFAULT FALSE,
        description TEXT,
        company_logo_url VARCHAR(500),
        employment_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Education table
            `CREATE TABLE IF NOT EXISTS education (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        school_name VARCHAR(200) NOT NULL,
        degree VARCHAR(200),
        field_of_study VARCHAR(200),
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT FALSE,
        description TEXT,
        school_logo_url VARCHAR(500),
        gpa DECIMAL(3,2),
        activities TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Honors & Awards table
            `CREATE TABLE IF NOT EXISTS honors_awards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        issuer VARCHAR(200),
        issue_date DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Certifications table
            `CREATE TABLE IF NOT EXISTS certifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        issuing_organization VARCHAR(200),
        issue_date DATE,
        expiration_date DATE,
        credential_id VARCHAR(200),
        credential_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Projects table
            `CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT FALSE,
        technologies TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Languages table
            `CREATE TABLE IF NOT EXISTS languages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(100) NOT NULL,
        proficiency VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Volunteer Experience table
            `CREATE TABLE IF NOT EXISTS volunteer_experience (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        organization VARCHAR(200) NOT NULL,
        role VARCHAR(200) NOT NULL,
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT FALSE,
        description TEXT,
        cause VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
            // Publications table
            `CREATE TABLE IF NOT EXISTS publications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        publisher VARCHAR(200),
        publication_date DATE,
        url VARCHAR(500),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
        ];
        for (const tableSql of tables) {
            try {
                await pool.query(tableSql);
                console.log('✅ Table created or already exists');
            }
            catch (err) {
                console.log('Note: Table may already exist:', err.message);
            }
        }
        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_swipes_job_id ON swipes(job_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_startup_id ON matches(startup_id)',
            'CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON chat_messages(match_id)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)',
            'CREATE INDEX IF NOT EXISTS idx_work_experience_user_id ON work_experience(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_honors_awards_user_id ON honors_awards(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_languages_user_id ON languages(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_volunteer_experience_user_id ON volunteer_experience(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_publications_user_id ON publications(user_id)'
        ];
        for (const indexSql of indexes) {
            try {
                await pool.query(indexSql);
            }
            catch (err) {
                // Index may already exist
            }
        }
        console.log('✅ Database initialized');
    }
    catch (err) {
        console.error('❌ Database init failed:', err.message);
        throw err;
    }
};
exports.initDB = initDB;
exports.default = pool;
//# sourceMappingURL=index.js.map