import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import winston from 'winston';
import path from 'path';

import authRoutes from './routes/auth';
import startupRoutes from './routes/startups';
import swipeRoutes from './routes/swipes';
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
import { initSocketHandlers } from './socket/handlers';

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
    // eslint-disable-next-line no-console
    console.error('FATAL: JWT_SECRET must be set to a strong random value (>= 32 chars) in production.');
    process.exit(1);
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32 || placeholders.includes(jwtRefreshSecret)) {
    // eslint-disable-next-line no-console
    console.error('FATAL: JWT_REFRESH_SECRET must be set to a strong random value (>= 32 chars) in production.');
    process.exit(1);
  }
  if (!process.env.CLIENT_URL) {
    // eslint-disable-next-line no-console
    console.error('FATAL: CLIENT_URL must be set in production (used for CORS).');
    process.exit(1);
  }
}

// Logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Redis client
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => logger.error('Redis Client Error', err));
redis.connect();

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
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(compression());

app.use(cors({ origin: corsOrigins, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many auth attempts'
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Stripe webhook needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/profile-enhanced', profileEnhancedRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/location', locationRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const redisHealth = redis.isReady ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    redis: redisHealth,
    version: '2.0.0'
  });
});

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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
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
    logger.error('❌ Database setup failed:', err);
  }
};

httpServer.listen(PORT, () => {
  logger.info(`🚀 SwipeHire server v2.0 running on port ${PORT}`);
  setupDatabase();
});

export { io };