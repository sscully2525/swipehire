import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Use DATABASE_URL if available (Railway provides this), otherwise use individual vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : new Pool({
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
  // Don't kill the process on a transient idle-client error — pg will
  // recreate the connection on the next checkout. Just log and move on.
  
  console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();

/**
 * Bootstrap the database. Tests connection, then runs all pending SQL
 * migrations from `server/migrations/`. The legacy inline schema has
 * moved into `migrations/001_init.sql`.
 */
export const initDB = async () => {
  try {
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    
    console.log('✅ Database connected');

    const { runMigrations } = await import('./migrate');
    await runMigrations();

    
    console.log('✅ Database initialized');
  } catch (err: any) {
    
    console.error('❌ Database init failed:', err.message);
    throw err;
  }
};

export default pool;
