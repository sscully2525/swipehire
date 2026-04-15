import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import winston from 'winston';

import authRoutes from './routes/auth';
import startupRoutes from './routes/startups';
import swipeRoutes from './routes/swipes';
import matchRoutes from './routes/matches';
import profileRoutes from './routes/profile';
import chatRoutes from './routes/chat';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payments';
import aiRoutes from './routes/ai';
import stripeRoutes from './routes/stripe';
import recruiterRoutes from './routes/recruiter';
import setupRoutes from './routes/setup';
import { initSocketHandlers } from './socket/handlers';

dotenv.config();

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
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/setup', setupRoutes);

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
    
    // Check if admin exists
    const adminResult = await query("SELECT * FROM users WHERE email = 'admin@swipehire.com'");
    if (adminResult.rows.length === 0) {
      // Create default admin
      const id = uuidv4();
      const passwordHash = await bcrypt.hash('admin123', 12);
      await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified, onboarding_completed)
         VALUES ($1, $2, $3, $4, $5, 'admin', true, true)`,
        [id, 'admin@swipehire.com', passwordHash, 'Admin', 'User']
      );
      logger.info('✅ Default admin created: admin@swipehire.com / admin123');
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