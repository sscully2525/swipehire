/**
 * Per-route rate limiters backed by a Redis store.
 *
 * Why per-route: the single global limiter (100 req / 15min / IP) is fine
 * as a backstop, but specific endpoints have very different abuse
 * profiles. Login should be tight per IP+email to slow credential
 * stuffing; swipes need to be loose because real users swipe a lot;
 * webhooks must never be rate-limited (Stripe retries on failure).
 *
 * If Redis isn't ready, we fall back to the in-memory store so the
 * limiter still works (best-effort across a single instance).
 */
import rateLimit, { Options } from 'express-rate-limit';
import RedisStore, { RedisReply } from 'rate-limit-redis';
import { redis } from '../redis';
import { logger } from '../logger';

const buildStore = (prefix: string) => {
  // Use the Redis-backed store only when the client is connected.
  // express-rate-limit will fall back to MemoryStore otherwise.
  if (!redis.isReady) {
    logger.debug({ prefix }, 'Rate limiter: using in-memory store (Redis not ready)');
    return undefined;
  }
  return new RedisStore({
    // node-redis v4 requires the multi-call signature
    sendCommand: (...args: string[]): Promise<RedisReply> =>
      redis.sendCommand(args) as Promise<RedisReply>,
    prefix,
  });
};

const baseOptions = (
  prefix: string,
  overrides: Partial<Options> & Pick<Options, 'windowMs' | 'max'>,
): Partial<Options> => ({
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(prefix),
  message: { error: 'Too many requests, slow down.' },
  // Rate-limit only in production. Dev/test skip entirely: the SPA polls
  // notifications every 30s and the dashboard fans out several requests per
  // page, so the 100/15min global backstop locks out a single local user
  // within minutes (every endpoint starts returning 429).
  skip: () => process.env.NODE_ENV !== 'production',
  ...overrides,
});

/** Global backstop: 100 req / 15min / IP. */
export const globalLimiter = rateLimit(
  baseOptions('rl:global:', {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP' },
  }),
);

/**
 * Login: 5/min keyed by IP+email so credential-stuffing across many
 * accounts hits the limit fast. 20/hour per IP (broader cap).
 */
export const loginLimiter = rateLimit(
  baseOptions('rl:login:', {
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
      const email = (req.body?.email || '').toString().toLowerCase().trim();
      return `${req.ip}:${email}`;
    },
    message: { error: 'Too many login attempts. Try again in a minute.' },
  }),
);

/** Hourly IP cap on login (broader). Layer with loginLimiter. */
export const loginHourlyLimiter = rateLimit(
  baseOptions('rl:loginh:', {
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts. Try again later.' },
  }),
);

/**
 * Registration: 20/hour/IP — still slows bulk-signup bots, but does not lock
 * out real users after a few validation retries or our production smoke tests.
 * v2 prefix intentionally resets the old overly-strict 3/hour counters.
 */
export const registerLimiter = rateLimit(
  baseOptions('rl:register:v2:', {
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { error: 'Too many sign-up attempts. Try again later.' },
  }),
);

/** Refresh: 30/min/user (or IP fallback) — covers normal silent refresh. */
export const refreshLimiter = rateLimit(
  baseOptions('rl:refresh:', {
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => {
      // We can't authenticate here (token in body), so fall back to IP
      // plus a hash of the token tail to spread legitimate clients.
      const tokenTail = (req.body?.refreshToken || '').toString().slice(-12);
      return `${req.ip}:${tokenTail}`;
    },
    message: { error: 'Too many refresh attempts.' },
  }),
);

/**
 * Payment endpoints (non-webhook): 10/min/user. Webhooks are mounted
 * separately and never see this limiter.
 */
export const paymentLimiter = rateLimit(
  baseOptions('rl:pay:', {
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
      const userId = (req as { userId?: string }).userId;
      return userId || req.ip || 'anon';
    },
    message: { error: 'Too many payment requests.' },
  }),
);

/** Swipes: 60/min/user — real users can swipe fast. */
export const swipeLimiter = rateLimit(
  baseOptions('rl:swipe:', {
    windowMs: 60 * 1000,
    max: 60,
    keyGenerator: (req) => {
      const userId = (req as { userId?: string }).userId;
      return userId || req.ip || 'anon';
    },
    message: { error: 'Slow down on the swipes.' },
  }),
);

/** Messages: 30/min/user — over chat REST API. */
export const messageLimiter = rateLimit(
  baseOptions('rl:msg:', {
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => {
      const userId = (req as { userId?: string }).userId;
      return userId || req.ip || 'anon';
    },
    message: { error: 'You are sending messages too fast.' },
  }),
);
