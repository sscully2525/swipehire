import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import authRoutes from './routes/auth';
import startupRoutes from './routes/startups';
import swipeRoutes from './routes/swipes';
import bidRoutes from './routes/bids';
import matchRoutes from './routes/matches';
import profileRoutes from './routes/profile';
import profileEnhancedRoutes from './routes/profile-enhanced';
import chatRoutes from './routes/chat';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payments';
import aiRoutes from './routes/ai';
import stripeRoutes from './routes/stripe';
import recruiterRoutes from './routes/recruiter';
import setupRoutes from './routes/setup';
import notificationRoutes from './routes/notifications';
import verificationRoutes from './routes/verification';
import locationRoutes from './routes/location';
import healthRoutes from './routes/health';
import { initSocketHandlers } from './socket/handlers';
import { logger, redactRedisUrl } from './logger';
import { redis, initRedis } from './redis';
import { requestId } from './middleware/requestId';
import {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  paymentLimiter,
  swipeLimiter,
  messageLimiter,
} from './middleware/rateLimit';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Fail fast on insecure config in production
if (isProduction) {
  const placeholders = [
    'CHANGE_THIS_TO_A_RANDOM_32_CHAR_STRING',
    'CHANGE_THIS_TO_A_DIFFERENT_RANDOM_32_CHAR_STRING',
    'your-secret-key-change-in-production',
    'your-refresh-secret',
    'change_me_to_a_long_random_string',
    'change_me_to_a_different_long_random_string',
  ];
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || placeholders.includes(jwtSecret)) {
    logger.fatal('JWT_SECRET must be set to a strong random value (>= 32 chars) in production.');
    process.exit(1);
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32 || placeholders.includes(jwtRefreshSecret)) {
    logger.fatal('JWT_REFRESH_SECRET must be set to a strong random value (>= 32 chars) in production.');
    process.exit(1);
  }
  if (!process.env.CLIENT_URL) {
    logger.fatal('CLIENT_URL must be set in production (used for CORS).');
    process.exit(1);
  }
}

// Boot log: which Redis URL we're attempting (redacted), so prod ops can
// confirm Railway env vars are wired through.
logger.info(
  { redisUrl: redactRedisUrl(process.env.REDIS_URL), nodeEnv: process.env.NODE_ENV || 'development' },
  '🚀 Gigly server bootstrap',
);

// Initialize Redis (background; HTTP server still binds even if Redis is slow)
initRedis();

// Re-export for legacy imports (`import { redis, logger } from './index'`).
export { redis, logger };

const app = express();

// Trust proxy (required for rate limiting behind nginx)
app.set('trust proxy', 1);

const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;

// Build CORS allowlist (comma-separated CLIENT_URL supported).
// In production, client and server are the same origin — no cross-origin requests.
// In dev, the Vite proxy handles /api, so CORS is only needed for direct access.
const corsOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: { origin: corsOrigins, credentials: true }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(compression());

app.use(cors({ origin: corsOrigins, credentials: true }));

// Request-scoped ID + structured logging.
// Must run early so every downstream log line gets a requestId.
app.use(requestId);
app.use(
  // The @types for pino-http v11 expect Node IncomingMessage rather than
  // Express Request, which collides with Express's RequestHandler shape.
  // Behaviour is correct at runtime; cast at the use-site.
  pinoHttp({
    logger: logger._pino,
    genReqId: (req) => (req as { id?: string }).id || 'unknown',
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customProps: (req) => ({ requestId: (req as { id?: string }).id }),
    serializers: {
      req: (req: unknown) => {
        const r = req as { method?: string; url?: string; remoteAddress?: string };
        return { method: r.method, url: r.url, remoteAddress: r.remoteAddress };
      },
    },
  }) as unknown as express.RequestHandler,
);

// Global rate limit (applies to all routes; per-route limiters below add stricter caps)
app.use(globalLimiter);

// Stripe webhook needs the raw request bytes for signature verification.
// This MUST be registered before express.json() / express.urlencoded(),
// otherwise body-parser will consume the stream first and verification
// will fail. (See AUDIT_REPORT.md — critical fix.)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health/liveness/readiness — mounted before per-route limiters so probes always answer.
app.use('/api/health', healthRoutes);

// Auth: granular limits per endpoint.
// (auth router internally maps these to /login, /signup, etc.)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/recruiter/signup', registerLimiter);
app.use('/api/auth/signup', registerLimiter);
app.use('/api/auth/refresh', refreshLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/swipes', swipeLimiter, swipeRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/profile-enhanced', profileEnhancedRoutes);
app.use('/api/chat', messageLimiter, chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);
app.use('/api/ai', aiRoutes);
// Stripe webhooks bypass rate limit (Stripe needs to retry freely); other Stripe
// routes are limited via paymentLimiter equivalent. Keep webhook untouched.
app.use('/api/stripe', stripeRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/location', locationRoutes);

// Serve React app in production (must come after all API routes)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  // Hashed asset files get long-lived cache; everything else gets no-cache
  app.use(express.static(clientDist, {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Central error handler — logs with requestId + path + (optional) user, returns
// a safe payload with the requestId so support can correlate.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const reqId = (req as any).id;
  const userId = (req as any).userId;
  logger.error(
    {
      err: { message: err?.message, stack: err?.stack },
      requestId: reqId,
      userId,
      path: req.path,
      method: req.method,
    },
    'Unhandled error',
  );
  res.status(err?.status || 500).json({
    error: isProduction ? 'Internal server error' : err?.message || 'Internal server error',
    requestId: reqId,
  });
});

// Socket.io handlers
initSocketHandlers(io);

// Auto-initialize database and create default admin
import { initDB } from './db';
import { query } from './db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const setupDatabase = async () => {
  try {
    await initDB();
    logger.info('✅ Database initialized');

    // Optionally seed a default admin in non-production environments only,
    // or when explicitly requested via SEED_DEFAULT_ADMIN=true.
    // The default password can be overridden with DEFAULT_ADMIN_PASSWORD.
    const shouldSeedAdmin =
      process.env.SEED_DEFAULT_ADMIN === 'true' || !isProduction;
    if (shouldSeedAdmin) {
      const adminResult = await query(
        "SELECT id FROM users WHERE email = 'admin@swipehire.com'"
      );
      if (adminResult.rows.length === 0) {
        const id = uuidv4();
        const defaultPwd = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        const passwordHash = await bcrypt.hash(defaultPwd, 12);
        await query(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified, onboarding_completed)
           VALUES ($1, $2, $3, $4, $5, 'admin', true, true)`,
          [id, 'admin@swipehire.com', passwordHash, 'Admin', 'User']
        );
        logger.warn('⚠️  Default admin seeded: admin@swipehire.com (change password immediately)');
      }
    }
  } catch (err) {
    logger.error({ err }, '❌ Database setup failed');
  }
};

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, `🚀 Gigly server v2.1 running`);
  setupDatabase();
});

/**
 * Graceful shutdown:
 *   1. Stop accepting new HTTP connections.
 *   2. Wait up to 30s for in-flight requests to finish.
 *   3. Notify socket.io clients + close their connections.
 *   4. Close Redis + pg pool.
 *   5. exit(0).
 *
 * Crucial for zero-downtime Railway redeploys: Railway sends SIGTERM and
 * gives us a grace period before SIGKILL.
 */
let shuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 30_000;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn({ signal }, 'Graceful shutdown initiated');

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timeout hit — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  try {
    // 1. Stop HTTP listener
    await new Promise<void>((resolve) => {
      httpServer.close((err) => {
        if (err) logger.error({ err: err.message }, 'HTTP server close error');
        resolve();
      });
    });
    logger.info('HTTP server stopped accepting connections');

    // 2. Tell socket clients to reconnect, then close sockets.
    try {
      io.emit('server_shutdown', { message: 'Server restarting, please reconnect.' });
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Failed to broadcast shutdown event');
    }
    await new Promise<void>((resolve) => io.close(() => resolve()));
    logger.info('Socket.io connections closed');

    // 3. Close Redis
    try {
      if (redis.isOpen) await redis.quit();
      logger.info('Redis client closed');
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Redis quit error');
    }

    // 4. Close pg pool
    try {
      const { default: pgPool } = await import('./db');
      await pgPool.end();
      logger.info('Postgres pool closed');
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Postgres pool close error');
    }

    clearTimeout(forceExit);
    logger.info('Goodbye 👋');
    process.exit(0);
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Shutdown error');
    process.exit(1);
  }
};

['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => void shutdown(sig));
});

// Catch unhandled rejections and uncaught exceptions: log + exit so the
// orchestrator restarts us cleanly rather than entering an undefined state.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'Uncaught exception — exiting');
  void shutdown('uncaughtException');
});

export { io };
