"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const user_1 = require("../models/user");
const crypto_1 = __importDefault(require("crypto"));
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
// Generate LinkedIn verification code
router.post('/linkedin/generate-code', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Generate a unique code
        const code = `SH-${crypto_1.default.randomBytes(4).toString('hex').toUpperCase()}`;
        // Store code with expiration (24 hours)
        await (0, db_1.query)(`INSERT INTO verification_codes (user_id, code, type, expires_at)
       VALUES ($1, $2, 'linkedin', CURRENT_TIMESTAMP + INTERVAL '24 hours')`, [userId, code]);
        res.json({
            code,
            instructions: `Add this code to your LinkedIn profile headline or about section: ${code}`,
            verifyUrl: `/api/verify/linkedin/check/${userId}`
        });
    }
    catch (error) {
        console.error('Generate LinkedIn code error:', error);
        res.status(500).json({ error: 'Failed to generate verification code' });
    }
});
// Check LinkedIn verification (manual review endpoint)
router.post('/linkedin/verify', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { linkedInProfileUrl } = req.body;
        // Update user with LinkedIn URL and mark as pending verification
        await (0, db_1.query)(`UPDATE users SET linkedin_url = $1, linkedin_verified = false WHERE id = $2`, [linkedInProfileUrl, userId]);
        // In production, you'd use a scraper or LinkedIn API to verify
        // For now, we'll create a verification request
        await (0, db_1.query)(`INSERT INTO verification_requests (user_id, type, data, status)
       VALUES ($1, 'linkedin', $2, 'pending')`, [userId, JSON.stringify({ linkedInProfileUrl })]);
        res.json({
            message: 'Verification request submitted',
            status: 'pending',
            note: 'Our team will verify your LinkedIn profile within 24 hours'
        });
    }
    catch (error) {
        console.error('LinkedIn verification error:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
});
// Identity verification using document upload
router.post('/identity/upload', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { documentType, documentUrl } = req.body;
        // Store document for review
        await (0, db_1.query)(`INSERT INTO verification_documents (user_id, document_type, document_url, status)
       VALUES ($1, $2, $3, 'pending')`, [userId, documentType, documentUrl]);
        res.json({
            message: 'Document uploaded successfully',
            status: 'pending_review',
            note: 'Your document will be reviewed within 24-48 hours'
        });
    }
    catch (error) {
        console.error('Identity upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});
// Company verification
router.post('/company/verify', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { startupId, verificationMethod, data } = req.body;
        // Check if user owns the company
        const companyResult = await (0, db_1.query)('SELECT * FROM startups WHERE id = $1 AND created_by = $2', [startupId, userId]);
        if (companyResult.rows.length === 0) {
            return res.status(403).json({ error: 'You do not own this company' });
        }
        // Create verification request
        await (0, db_1.query)(`INSERT INTO company_verifications (startup_id, method, data, status, submitted_by)
       VALUES ($1, $2, $3, 'pending', $4)`, [startupId, verificationMethod, JSON.stringify(data), userId]);
        // Update company to pending verification
        await (0, db_1.query)("UPDATE startups SET verified = false WHERE id = $1", [startupId]);
        res.json({
            message: 'Company verification request submitted',
            status: 'pending',
            methods: [
                'domain_email: Verify using company email domain',
                'linkedin: Verify LinkedIn company page',
                'documents: Upload incorporation documents',
                'credit_card: Verify using company credit card'
            ]
        });
    }
    catch (error) {
        console.error('Company verification error:', error);
        res.status(500).json({ error: 'Failed to submit company verification' });
    }
});
// Get verification status
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const userResult = await (0, db_1.query)('SELECT linkedin_verified, identity_verified, email_verified FROM users WHERE id = $1', [userId]);
        const pendingDocs = await (0, db_1.query)('SELECT * FROM verification_documents WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const pendingRequests = await (0, db_1.query)('SELECT * FROM verification_requests WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json({
            verifications: userResult.rows[0],
            pendingDocuments: pendingDocs.rows,
            pendingRequests: pendingRequests.rows
        });
    }
    catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ error: 'Failed to get verification status' });
    }
});
// Admin: Approve/reject verification
router.post('/admin/review', authenticate, async (req, res) => {
    try {
        const { requestId, type, action, notes } = req.body;
        // Check if user is admin
        const userResult = await (0, db_1.query)("SELECT role FROM users WHERE id = $1", [req.userId]);
        if (userResult.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        if (type === 'identity') {
            const docResult = await (0, db_1.query)('SELECT * FROM verification_documents WHERE id = $1', [requestId]);
            if (docResult.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            const doc = docResult.rows[0];
            await (0, db_1.query)(`UPDATE verification_documents 
         SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, notes = $3
         WHERE id = $4`, [action, req.userId, notes, requestId]);
            if (action === 'approved') {
                await (0, db_1.query)('UPDATE users SET identity_verified = true WHERE id = $1', [doc.user_id]);
            }
        }
        else if (type === 'linkedin') {
            const reqResult = await (0, db_1.query)('SELECT * FROM verification_requests WHERE id = $1', [requestId]);
            if (reqResult.rows.length === 0) {
                return res.status(404).json({ error: 'Request not found' });
            }
            const request = reqResult.rows[0];
            await (0, db_1.query)(`UPDATE verification_requests 
         SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, notes = $3
         WHERE id = $4`, [action, req.userId, notes, requestId]);
            if (action === 'approved') {
                await (0, db_1.query)('UPDATE users SET linkedin_verified = true WHERE id = $1', [request.user_id]);
            }
        }
        res.json({ message: `Verification ${action} successfully` });
    }
    catch (error) {
        console.error('Admin review error:', error);
        res.status(500).json({ error: 'Failed to process review' });
    }
});
exports.default = router;
//# sourceMappingURL=verification.js.map