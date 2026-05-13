import { Router, Request, Response } from 'express';
import { query } from '../db';
import { isRedisReady, pingRedis, getRedisLastError } from '../redis';

const router = Router();

const SERVER_VERSION = '2.1.0';
const STARTED_AT = Date.now();

interface ComponentHealth {
  status: 'connected' | 'disconnected' | 'degraded';
  latencyMs?: number;
  lastError?: string;
}

async function checkDb(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await Promise.race([
      query('SELECT 1'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('db ping timeout')), 2000)
      ),
    ]);
    return { status: 'connected', latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      status: 'disconnected',
      lastError: err?.message || String(err),
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  if (!isRedisReady()) {
    return {
      status: 'disconnected',
      lastError: getRedisLastError()?.message,
    };
  }
  const latencyMs = await pingRedis();
  if (latencyMs === null) {
    return { status: 'degraded', lastError: getRedisLastError()?.message };
  }
  return { status: 'connected', latencyMs };
}

/**
 * GET /api/health — liveness probe. Always 200 if the process is alive.
 * Body still reports component health so dashboards can graph it.
 */
router.get('/', async (_req: Request, res: Response) => {
  const [redis, db] = await Promise.all([checkRedis(), checkDb()]);
  res.status(200).json({
    status: 'ok',
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    redis,
    db,
  });
});

/**
 * GET /api/health/ready — readiness probe. 503 if Redis or DB is down.
 * Wire this into Railway's healthcheck so unhealthy containers get cycled.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const [redis, db] = await Promise.all([checkRedis(), checkDb()]);
  const ready = redis.status === 'connected' && db.status === 'connected';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    redis,
    db,
  });
});

export default router;
