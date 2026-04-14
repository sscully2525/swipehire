"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSwipeStats = exports.getRemainingSwipes = exports.updateMatchStatus = exports.getMatchById = exports.getUserMatches = exports.createMatch = exports.checkForMatch = exports.createSwipe = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
const index_1 = require("../index");
const createSwipe = async (userId, jobId, direction, aiMatchScore) => {
    const id = (0, uuid_1.v4)();
    const result = await (0, db_1.query)(`INSERT INTO swipes (id, user_id, job_id, direction, ai_match_score)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, job_id) 
     DO UPDATE SET direction = $4, ai_match_score = $5, created_at = CURRENT_TIMESTAMP
     RETURNING *`, [id, userId, jobId, direction, aiMatchScore]);
    // Invalidate job cache for user
    await index_1.redis.del(`jobs:${userId}:*`);
    return result.rows[0];
};
exports.createSwipe = createSwipe;
const checkForMatch = async (userId, jobId) => {
    // For demo: 40% chance of match on right swipe
    // In production, this would check if company has also expressed interest
    return Math.random() < 0.4;
};
exports.checkForMatch = checkForMatch;
const createMatch = async (userId, jobId) => {
    // Get startup_id from job
    const jobResult = await (0, db_1.query)('SELECT startup_id FROM jobs WHERE id = $1', [jobId]);
    const startupId = jobResult.rows[0]?.startup_id;
    const id = (0, uuid_1.v4)();
    const result = await (0, db_1.query)(`INSERT INTO matches (id, user_id, job_id, startup_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (user_id, job_id) DO NOTHING
     RETURNING *`, [id, userId, jobId, startupId]);
    if (result.rows.length === 0) {
        // Match already exists, fetch it
        const existing = await (0, db_1.query)('SELECT * FROM matches WHERE user_id = $1 AND job_id = $2', [userId, jobId]);
        return existing.rows[0];
    }
    // Create notification for user
    await (0, db_1.query)(`INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, 'match', 'New Match!', 'You matched with a startup!', $2)`, [userId, JSON.stringify({ matchId: result.rows[0].id, jobId })]);
    return result.rows[0];
};
exports.createMatch = createMatch;
const getUserMatches = async (userId) => {
    const result = await (0, db_1.query)(`SELECT m.*, s.name as startup_name, s.logo_url as startup_logo, 
            s.slug as startup_slug, s.verified as startup_verified,
            j.title as job_title, j.salary_min, j.salary_max, 
            j.location as job_location, j.remote_allowed,
            (SELECT COUNT(*) FROM chat_messages WHERE match_id = m.id AND sender_type = 'company' AND read_at IS NULL) as unread_count
     FROM matches m
     JOIN startups s ON m.startup_id = s.id
     JOIN jobs j ON m.job_id = j.id
     WHERE m.user_id = $1
     ORDER BY m.created_at DESC`, [userId]);
    return result.rows;
};
exports.getUserMatches = getUserMatches;
const getMatchById = async (matchId) => {
    const result = await (0, db_1.query)(`SELECT m.*, s.name as startup_name, s.logo_url as startup_logo,
            j.title as job_title, u.first_name as user_first_name, u.last_name as user_last_name
     FROM matches m
     JOIN startups s ON m.startup_id = s.id
     JOIN jobs j ON m.job_id = j.id
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1`, [matchId]);
    return result.rows[0] || null;
};
exports.getMatchById = getMatchById;
const updateMatchStatus = async (matchId, status, updates) => {
    const fields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];
    let paramIndex = 2;
    if (updates?.scheduledCallAt) {
        fields.push(`scheduled_call_at = $${paramIndex}`);
        values.push(updates.scheduledCallAt);
        paramIndex++;
    }
    if (updates?.callLink) {
        fields.push(`call_link = $${paramIndex}`);
        values.push(updates.callLink);
        paramIndex++;
    }
    if (updates?.notes) {
        fields.push(`notes = $${paramIndex}`);
        values.push(updates.notes);
        paramIndex++;
    }
    values.push(matchId);
    await (0, db_1.query)(`UPDATE matches SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
};
exports.updateMatchStatus = updateMatchStatus;
const getRemainingSwipes = async (userId, dailyLimit) => {
    const result = await (0, db_1.query)(`SELECT $1 - COUNT(*) as remaining
     FROM swipes 
     WHERE user_id = $2 
       AND created_at > CURRENT_DATE
       AND direction = 'right'`, [dailyLimit, userId]);
    return Math.max(0, result.rows[0]?.remaining || dailyLimit);
};
exports.getRemainingSwipes = getRemainingSwipes;
const getSwipeStats = async (userId) => {
    const result = await (0, db_1.query)(`SELECT 
       COUNT(*) FILTER (WHERE direction = 'right') as right_swipes,
       COUNT(*) FILTER (WHERE direction = 'left') as left_swipes,
       COUNT(*) FILTER (WHERE direction = 'right' AND created_at > CURRENT_DATE) as today_right_swipes
     FROM swipes 
     WHERE user_id = $1`, [userId]);
    return result.rows[0];
};
exports.getSwipeStats = getSwipeStats;
//# sourceMappingURL=swipe.js.map