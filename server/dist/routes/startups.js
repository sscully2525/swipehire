"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const startup_1 = require("../models/startup");
const user_1 = require("../models/user");
const ai_1 = require("../services/ai");
const router = (0, express_1.Router)();
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = (0, user_1.verifyAccessToken)(token);
        req.userId = decoded.userId;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            remoteOnly: req.query.remote === 'true',
            minSalary: req.query.minSalary ? parseInt(req.query.minSalary) : undefined,
            stages: req.query.stages ? req.query.stages.split(',') : undefined,
            techStack: req.query.tech ? req.query.tech.split(',') : undefined
        };
        const jobs = await (0, startup_1.getJobsForSwiping)(req.userId, filters);
        // Calculate AI match scores
        const jobsWithScores = await Promise.all(jobs.map(async (job) => ({
            ...job,
            match_score: await (0, ai_1.calculateMatchScore)(req.userId, job.id)
        })));
        // Sort by match score (highest first)
        jobsWithScores.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        res.json(jobsWithScores);
    }
    catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});
router.get('/filters', authenticate, async (req, res) => {
    try {
        // Get available filters
        const stagesResult = await (0, db_1.query)('SELECT DISTINCT stage FROM startups ORDER BY stage');
        const techResult = await (0, db_1.query)(`
      SELECT DISTINCT unnest(tech_stack) as tech 
      FROM jobs 
      WHERE tech_stack IS NOT NULL 
      ORDER BY tech
    `);
        const locationsResult = await (0, db_1.query)('SELECT DISTINCT location FROM startups WHERE location IS NOT NULL ORDER BY location');
        res.json({
            stages: stagesResult.rows.map(r => r.stage),
            techStack: techResult.rows.map(r => r.tech),
            locations: locationsResult.rows.map(r => r.location)
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch filters' });
    }
});
router.get('/:id', authenticate, async (req, res) => {
    try {
        const job = await (0, startup_1.getJobById)(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Increment view count
        await (0, startup_1.incrementJobViews)(req.params.id);
        // Calculate match score
        const matchScore = await (0, ai_1.calculateMatchScore)(req.userId, req.params.id);
        res.json({ ...job, match_score: matchScore });
    }
    catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});
router.post('/seed', async (req, res) => {
    try {
        await (0, startup_1.seedStartupsAndJobs)();
        res.json({ message: 'Startups and jobs seeded successfully' });
    }
    catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ error: 'Failed to seed data' });
    }
});
exports.default = router;
//# sourceMappingURL=startups.js.map