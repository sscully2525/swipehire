"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.redis = exports.logger = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const winston_1 = __importDefault(require("winston"));
const auth_1 = __importDefault(require("./routes/auth"));
const startups_1 = __importDefault(require("./routes/startups"));
const swipes_1 = __importDefault(require("./routes/swipes"));
const matches_1 = __importDefault(require("./routes/matches"));
const profile_1 = __importDefault(require("./routes/profile"));
const profile_enhanced_1 = __importDefault(require("./routes/profile-enhanced"));
const chat_1 = __importDefault(require("./routes/chat"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const admin_1 = __importDefault(require("./routes/admin"));
const payments_1 = __importDefault(require("./routes/payments"));
const ai_1 = __importDefault(require("./routes/ai"));
const stripe_1 = __importDefault(require("./routes/stripe"));
const recruiter_1 = __importDefault(require("./routes/recruiter"));
const setup_1 = __importDefault(require("./routes/setup"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const handlers_1 = require("./socket/handlers");
dotenv_1.default.config();
// Logger
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' })
    ]
});
// Redis client
exports.redis = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
exports.redis.on('error', (err) => exports.logger.error('Redis Client Error', err));
exports.redis.connect();
const app = (0, express_1.default)();
// Trust proxy (required for rate limiting behind nginx)
app.set('trust proxy', 1);
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }
});
exports.io = io;
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use(limiter);
// Stricter rate limit for auth
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many auth attempts'
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Stripe webhook needs raw body
app.use('/api/stripe/webhook', express_1.default.raw({ type: 'application/json' }));
// Request logging
app.use((req, res, next) => {
    exports.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});
// Routes
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/startups', startups_1.default);
app.use('/api/swipes', swipes_1.default);
app.use('/api/matches', matches_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/profile-enhanced', profile_enhanced_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/stripe', stripe_1.default);
app.use('/api/recruiter', recruiter_1.default);
app.use('/api/setup', setup_1.default);
app.use('/api/notifications', notifications_1.default);
// Health check
app.get('/api/health', async (req, res) => {
    const redisHealth = exports.redis.isReady ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: redisHealth,
        version: '2.0.0'
    });
});
// Error handling
app.use((err, req, res, next) => {
    exports.logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});
// Socket.io handlers
(0, handlers_1.initSocketHandlers)(io);
// Auto-initialize database and create default admin
const db_1 = require("./db");
const db_2 = require("./db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const setupDatabase = async () => {
    try {
        await (0, db_1.initDB)();
        exports.logger.info('✅ Database initialized');
        // Check if admin exists
        const adminResult = await (0, db_2.query)("SELECT * FROM users WHERE email = 'admin@swipehire.com'");
        if (adminResult.rows.length === 0) {
            // Create default admin
            const id = (0, uuid_1.v4)();
            const passwordHash = await bcryptjs_1.default.hash('admin123', 12);
            await (0, db_2.query)(`INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified, onboarding_completed)
         VALUES ($1, $2, $3, $4, $5, 'admin', true, true)`, [id, 'admin@swipehire.com', passwordHash, 'Admin', 'User']);
            exports.logger.info('✅ Default admin created: admin@swipehire.com / admin123');
        }
    }
    catch (err) {
        exports.logger.error('❌ Database setup failed:', err);
    }
};
httpServer.listen(PORT, () => {
    exports.logger.info(`🚀 SwipeHire server v2.0 running on port ${PORT}`);
    setupDatabase();
});
//# sourceMappingURL=index.js.map