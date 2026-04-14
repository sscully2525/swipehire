"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOutreachMessage = exports.getRecommendations = exports.calculateMatchScore = void 0;
const db_1 = require("../db");
const index_1 = require("../index");
// Simple TF-IDF-like scoring for skill matching
const calculateMatchScore = async (userId, jobId) => {
    try {
        // Get user profile
        const userResult = await (0, db_1.query)(`SELECT skills, years_experience, preferred_salary_min, preferred_salary_max,
              remote_preference, location
       FROM users WHERE id = $1`, [userId]);
        // Get job details
        const jobResult = await (0, db_1.query)(`SELECT j.tech_stack, j.experience_level, j.salary_min, j.salary_max,
              j.remote_allowed, j.location, s.stage
       FROM jobs j
       JOIN startups s ON j.startup_id = s.id
       WHERE j.id = $1`, [jobId]);
        if (userResult.rows.length === 0 || jobResult.rows.length === 0) {
            return 0.5; // Default score
        }
        const user = userResult.rows[0];
        const job = jobResult.rows[0];
        let score = 0;
        let factors = 0;
        // Skill match (40% weight)
        if (user.skills && job.tech_stack) {
            const userSkills = user.skills.map((s) => s.toLowerCase());
            const jobSkills = job.tech_stack.map((s) => s.toLowerCase());
            const matches = jobSkills.filter((s) => userSkills.some((us) => us.includes(s) || s.includes(us)));
            score += (matches.length / Math.max(jobSkills.length, 1)) * 0.4;
            factors++;
        }
        // Experience level match (20% weight)
        if (user.years_experience && job.experience_level) {
            const expLevels = {
                'junior': 1, 'mid': 3, 'senior': 5, 'staff': 8, 'principal': 10
            };
            const requiredExp = expLevels[job.experience_level] || 3;
            const userExp = user.years_experience;
            if (userExp >= requiredExp) {
                score += 0.2;
            }
            else if (userExp >= requiredExp * 0.7) {
                score += 0.1;
            }
            factors++;
        }
        // Salary alignment (20% weight)
        if (user.preferred_salary_min && job.salary_max) {
            if (job.salary_max >= user.preferred_salary_min) {
                score += 0.2;
            }
            else if (job.salary_max >= user.preferred_salary_min * 0.9) {
                score += 0.1;
            }
            factors++;
        }
        // Remote preference (10% weight)
        if (user.remote_preference !== undefined && job.remote_allowed !== undefined) {
            if (user.remote_preference === 'remote' && job.remote_allowed) {
                score += 0.1;
            }
            else if (user.remote_preference === 'onsite' && !job.remote_allowed) {
                score += 0.1;
            }
            else if (user.remote_preference === 'hybrid') {
                score += 0.05;
            }
            factors++;
        }
        // Stage preference boost (10% weight)
        const stageScores = {
            'Seed': 0.08, 'Series A': 0.1, 'Series B': 0.08,
            'Series C': 0.05, 'Series D+': 0.03
        };
        if (job.stage && stageScores[job.stage]) {
            score += stageScores[job.stage];
            factors++;
        }
        // Normalize score
        const finalScore = factors > 0 ? Math.min(score / (factors * 0.25), 1) : 0.5;
        return Math.round(finalScore * 100) / 100;
    }
    catch (err) {
        console.error('AI match score error:', err);
        return 0.5;
    }
};
exports.calculateMatchScore = calculateMatchScore;
// Get personalized job recommendations
const getRecommendations = async (userId, limit = 5) => {
    const cacheKey = `recommendations:${userId}`;
    const cached = await index_1.redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    // Get user's top skills and preferences
    const userResult = await (0, db_1.query)(`SELECT skills, preferred_salary_min, remote_preference
     FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
        return [];
    }
    const user = userResult.rows[0];
    // Find jobs matching user's profile
    const jobsResult = await (0, db_1.query)(`SELECT j.*, s.name as startup_name, s.logo_url, s.stage, s.verified,
            s.location as startup_location
     FROM jobs j
     JOIN startups s ON j.startup_id = s.id
     WHERE j.status = 'active'
       AND j.id NOT IN (SELECT job_id FROM swipes WHERE user_id = $1)
       AND ($2::text[] IS NULL OR j.tech_stack && $2)
       AND ($3::integer IS NULL OR j.salary_max >= $3)
       AND ($4::boolean IS NULL OR j.remote_allowed = $4)
     ORDER BY j.featured DESC, j.created_at DESC
     LIMIT $5`, [userId, user.skills, user.preferred_salary_min,
        user.remote_preference === 'remote' ? true : null, limit]);
    // Calculate match scores for each job
    const recommendations = await Promise.all(jobsResult.rows.map(async (job) => ({
        ...job,
        match_score: await (0, exports.calculateMatchScore)(userId, job.id)
    })));
    // Sort by match score
    recommendations.sort((a, b) => b.match_score - a.match_score);
    // Cache for 10 minutes
    await index_1.redis.setEx(cacheKey, 600, JSON.stringify(recommendations));
    return recommendations;
};
exports.getRecommendations = getRecommendations;
// Generate personalized outreach message
const generateOutreachMessage = async (userId, jobId) => {
    const userResult = await (0, db_1.query)(`SELECT first_name, title, skills, bio FROM users WHERE id = $1`, [userId]);
    const jobResult = await (0, db_1.query)(`SELECT j.title, j.description, s.name as startup_name
     FROM jobs j
     JOIN startups s ON j.startup_id = s.id
     WHERE j.id = $1`, [jobId]);
    if (userResult.rows.length === 0 || jobResult.rows.length === 0) {
        return '';
    }
    const user = userResult.rows[0];
    const job = jobResult.rows[0];
    // Generate personalized message template
    const templates = [
        `Hi! I'm ${user.first_name}, a ${user.title || 'software engineer'}. I'm excited about the ${job.title} role at ${job.startup_name} because ${job.description.slice(0, 100)}... I'd love to learn more about how I can contribute.`,
        `Hello! ${user.first_name} here. Your ${job.title} position caught my eye - my experience with ${user.skills?.slice(0, 3).join(', ') || 'relevant technologies'} seems like a great fit. Would love to chat!`,
        `Hi ${job.startup_name} team! I'm ${user.first_name}, ${user.bio?.slice(0, 80) || `a ${user.title || 'developer'}`}. The ${job.title} role aligns perfectly with what I'm looking for next.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
};
exports.generateOutreachMessage = generateOutreachMessage;
//# sourceMappingURL=ai.js.map