/**
 * Stripe webhook smoke test: verifies that the route is mounted with a
 * RAW body parser (signature verification needs the byte-exact body) and
 * that a signed test event is accepted.
 *
 * We mock the DB module so this test stays hermetic — no real Postgres
 * is needed in CI.
 */

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  __esModule: true,
  default: {},
}));

jest.mock('../models/user', () => {
  const actual = jest.requireActual('../models/user');
  return {
    ...actual,
    findUserById: jest.fn().mockResolvedValue({ id: 'u1', email: 'u1@example.com' }),
    verifyAccessToken: jest.fn(() => ({ userId: 'u1', type: 'access' })),
  };
});

jest.mock('../index', () => ({
  redis: { get: jest.fn(), setEx: jest.fn(), del: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import express from 'express';
import request from 'http';
import crypto from 'crypto';

describe('Stripe webhook', () => {
  const SECRET = 'whsec_test_secret_for_smoke';
  let server: any;
  let port: number;
  let originalSecret: string | undefined;

  beforeAll((done) => {
    originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    // Require route AFTER env is set so module-scope reads see the secret.
    const stripeRoutes = require('../routes/stripe').default;
    const app = express();
    // CRITICAL: raw body BEFORE json
    app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());
    app.use('/api/stripe', stripeRoutes);

    server = app.listen(0, () => {
      port = (server.address() as { port: number }).port;
      done();
    });
  });

  afterAll((done) => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    server.close(done);
  });

  it('accepts a signed event', async () => {
    const payload = JSON.stringify({
      id: 'evt_test',
      object: 'event',
      type: 'ping.test',
      data: { object: {} },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(signedPayload, 'utf8')
      .digest('hex');
    const stripeSig = `t=${timestamp},v1=${signature}`;

    const status = await new Promise<number>((resolve, reject) => {
      const req = request.request(
        {
          host: '127.0.0.1',
          port,
          path: '/api/stripe/webhook',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
            'stripe-signature': stripeSig,
          },
        },
        (res) => {
          res.on('data', () => undefined);
          res.on('end', () => resolve(res.statusCode || 0));
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    // The event type isn't handled but the signature should verify and
    // the route should respond 200 with { received: true }.
    expect(status).toBe(200);
  });

  it('rejects an invalid signature when secret is set', async () => {
    const payload = JSON.stringify({ id: 'evt_test_2', type: 'x' });
    const status = await new Promise<number>((resolve, reject) => {
      const req = request.request(
        {
          host: '127.0.0.1',
          port,
          path: '/api/stripe/webhook',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
            'stripe-signature': 't=1,v1=deadbeef',
          },
        },
        (res) => {
          res.on('data', () => undefined);
          res.on('end', () => resolve(res.statusCode || 0));
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    expect(status).toBe(400);
  });
});
