"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSwipeLimit = exports.invalidateRefreshToken = exports.storeRefreshToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokens = exports.verifyPassword = exports.updateLastActive = exports.updateUser = exports.findUserById = exports.findUserByEmail = exports.createUser = void 0;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const index_1 = require("../index");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const createUser = async (email, password, firstName, lastName, role = 'candidate') => {
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const id = (0, uuid_1.v4)();
    const result = await (0, db_1.query)(`INSERT INTO users (id, email, password_hash, first_name, last_name, daily_swipes, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, first_name, last_name, title, bio, skills, linkedin_url, 
               github_url, portfolio_url, resume_url, avatar_url, video_intro_url,
               location, years_experience, preferred_salary_min, preferred_salary_max,
               remote_preference, daily_swipes, subscription_tier, email_verified,
               linkedin_verified, identity_verified, onboarding_completed, last_active_at`, [id, email, passwordHash, firstName, lastName, 10, role]);
    return result.rows[0];
};
exports.createUser = createUser;
const findUserByEmail = async (email) => {
    const result = await (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    // Try cache first
    const cached = await index_1.redis.get(`user:${id}`);
    if (cached) {
        return JSON.parse(cached);
    }
    const result = await (0, db_1.query)(`SELECT id, email, first_name, last_name, title, bio, skills, linkedin_url, 
            github_url, portfolio_url, resume_url, avatar_url, video_intro_url,
            location, years_experience, preferred_salary_min, preferred_salary_max,
            remote_preference, daily_swipes, subscription_tier, email_verified,
            linkedin_verified, identity_verified, onboarding_completed, last_active_at
     FROM users WHERE id = $1`, [id]);
    const user = result.rows[0] || null;
    if (user) {
        await index_1.redis.setEx(`user:${id}`, 3600, JSON.stringify(user));
    }
    return user;
};
exports.findUserById = findUserById;
const updateUser = async (id, updates) => {
    const allowedFields = [
        'title', 'bio', 'skills', 'linkedin_url', 'github_url', 'portfolio_url',
        'resume_url', 'avatar_url', 'video_intro_url', 'location', 'years_experience',
        'preferred_salary_min', 'preferred_salary_max', 'remote_preference',
        'onboarding_completed'
    ];
    const fields = [];
    const values = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await (0, db_1.query)(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
     RETURNING *`, values);
    // Invalidate cache
    await index_1.redis.del(`user:${id}`);
    return result.rows[0];
};
exports.updateUser = updateUser;
const updateLastActive = async (userId) => {
    await (0, db_1.query)('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
};
exports.updateLastActive = updateLastActive;
const verifyPassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
const generateTokens = (userId) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
const storeRefreshToken = async (userId, token) => {
    await index_1.redis.setEx(`refresh:${userId}`, 7 * 24 * 3600, token);
};
exports.storeRefreshToken = storeRefreshToken;
const invalidateRefreshToken = async (userId) => {
    await index_1.redis.del(`refresh:${userId}`);
};
exports.invalidateRefreshToken = invalidateRefreshToken;
const getSwipeLimit = (tier) => {
    const limits = {
        free: 10,
        pro: 50,
        unlimited: 999999
    };
    return limits[tier] || 10;
};
exports.getSwipeLimit = getSwipeLimit;
//# sourceMappingURL=user.js.map