/**
 * Redis client wrapper.
 *
 * - Exponential backoff reconnection strategy (capped).
 * - Boot log indicates which URL is being attempted (password redacted).
 * - Exposes a `pingWithLatency()` helper used by the health checks.
 * - Tracks `lastError` for surfacing in `/api/health`.
 *
 * Notes on connection behaviour: with the strategy below, the client will
 * keep trying to connect in the background (every few seconds, capped).
 * Callers should check `redis.isReady` before using it for non-critical
 * reads, or wrap in try/catch.
 */
import { createClient, RedisClientType } from 'redis';
import { logger, redactRedisUrl } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let lastError: { message: string; at: string } | null = null;

/**
 * Exponential backoff: 100ms, 200ms, 400ms... capped at 5s.
 * Returns the delay in ms for the next reconnect attempt.
 */
const reconnectStrategy = (retries: number): number | Error => {
  const delay = Math.min(100 * Math.pow(2, retries), 5000);
  if (retries === 0 || retries === 5 || retries % 20 === 0) {
    logger.warn({ retries, delay }, 'Redis reconnect attempt');
  }
  return delay;
};

export const redis: RedisClientType = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy,
    // Tolerate a slow handshake but don't hang boot forever.
    connectTimeout: 5000,
  },
});

redis.on('error', (err: Error) => {
  lastError = { message: err.message, at: new Date().toISOString() };
  // Don't spam: pino-pretty would dump a stack on every reconnect. Log at debug
  // after the first failure for a given session.
  logger.error({ err: err.message }, 'Redis client error');
});

redis.on('connect', () => {
  logger.info({ url: redactRedisUrl(REDIS_URL) }, 'Redis connecting');
});

redis.on('ready', () => {
  lastError = null;
  logger.info({ url: redactRedisUrl(REDIS_URL) }, '✅ Redis ready');
});

redis.on('reconnecting', () => {
  logger.debug('Redis reconnecting');
});

redis.on('end', () => {
  logger.warn('Redis connection closed');
});

/**
 * Start the connection in the background. Don't await: we want the HTTP
 * server to bind even if Redis is temporarily unavailable, so liveness
 * checks still succeed.
 */
export const initRedis = (): void => {
  logger.info({ url: redactRedisUrl(REDIS_URL) }, 'Initializing Redis');
  redis.connect().catch((err: Error) => {
    lastError = { message: err.message, at: new Date().toISOString() };
    logger.error({ err: err.message }, 'Initial Redis connect failed (will retry in background)');
  });
};

export const getRedisLastError = () => lastError;

/**
 * Round-trip PING. Returns latency in ms, or null if the client isn't ready.
 * Times out after 2s to keep healthcheck cheap.
 */
export const pingRedis = async (): Promise<number | null> => {
  if (!redis.isReady) return null;
  const start = Date.now();
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ping timeout')), 2000)
      ),
    ]);
    if (result !== 'PONG') return null;
    return Date.now() - start;
  } catch (err: any) {
    lastError = { message: err?.message || String(err), at: new Date().toISOString() };
    return null;
  }
};

export const isRedisReady = (): boolean => redis.isReady;
