import fs from 'fs';
import path from 'path';
import pool from './index';

/**
 * Lightweight homegrown migration runner.
 *
 * - Reads `*.sql` files from `server/migrations/`, sorted lexicographically
 *   (so prefix files with zero-padded numbers, e.g. `001_init.sql`).
 * - Tracks applied migrations in a `schema_migrations` table.
 * - Each file is executed inside a single transaction.
 * - Safe to run repeatedly; already-applied migrations are skipped.
 *
 * Run via `npm run migrate` or programmatically from `initDB()`.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const listAppliedMigrations = async (): Promise<Set<string>> => {
  const result = await pool.query('SELECT name FROM schema_migrations');
  return new Set(result.rows.map((r: { name: string }) => r.name));
};

const listAvailableMigrations = (): string[] => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
};

export const runMigrations = async (): Promise<void> => {
  await ensureMigrationsTable();
  const applied = await listAppliedMigrations();
  const available = listAvailableMigrations();

  let ranAny = false;
  for (const file of available) {
    if (applied.has(file)) continue;
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      
      console.log(`✅ migration applied: ${file}`);
      ranAny = true;
    } catch (err) {
      await client.query('ROLLBACK');
      
      console.error(`❌ migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  if (!ranAny) {
    
    console.log('✅ migrations up to date');
  }
};

// Allow direct invocation via `npm run migrate` / `ts-node`.
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
