/**
 * Per-route rate limiter behavioural test. We don't hit a real Redis;
 * the limiters fall back to MemoryStore when redis.isReady is false,
 * and we mount them in an isolated Express app so we can spam requests.
 *
 * NODE_ENV=test causes our limiters to skip rate limiting (so the rest of
 * the test suite isn't slowed down or flaky). For this test specifically
 * we re-import the limiters with NODE_ENV unset.
 */

jest.mock('../redis', () => ({
  redis: { isReady: false },
  initRedis: jest.fn(),
  pingRedis: jest.fn(),
  isRedisReady: () => false,
  getRedisLastError: () => null,
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    _pino: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
    },
  },
  redactRedisUrl: (u: string) => u,
}));

import express from 'express';
import http from 'http';

describe('rate limiter', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // Unset 'test' so our `skip` predicate doesn't no-op the limiter.
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('blocks once the per-route max is exceeded', async () => {
    // Re-require so the limiter sees the new NODE_ENV value.
    jest.resetModules();
    const { messageLimiter } = await import('../middleware/rateLimit');

    const app = express();
    app.use(express.json());
    // Treat any caller as the same user (no auth).
    app.use((req, _res, next) => {
      (req as { userId?: string }).userId = 'u1';
      next();
    });
    app.post('/m', messageLimiter, (_req, res) => res.json({ ok: true }));

    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;

    const fire = () =>
      new Promise<number>((resolve) => {
        const req = http.request(
          { hostname: '127.0.0.1', port, path: '/m', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '2' } },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode || 0));
          },
        );
        req.write('{}');
        req.end();
      });

    // Limit is 30/min/user; fire 32 quickly. Last two should 429.
    const codes: number[] = [];
    for (let i = 0; i < 32; i++) codes.push(await fire());
    server.close();

    expect(codes.filter((c) => c === 200).length).toBe(30);
    expect(codes.filter((c) => c === 429).length).toBe(2);
  }, 15000);
});
