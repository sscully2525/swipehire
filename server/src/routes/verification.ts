import { Router } from 'express';
import { query } from '../db';
import crypto from 'crypto';
import { logger } from '../logger';
import { authenticate } from '../middleware/auth';

const router = Router();

// Generate LinkedIn verification code
router.post('/linkedin/generate-code', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Generate a unique code
    const code = `SH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // Store code with expiration (24 hours)
    await query(
      `INSERT INTO verification_codes (user_id, code, type, expires_at)
       VALUES ($1, $2, 'linkedin', CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
      [userId, code]
    );
    
    res.json({
      code,
      instructions: `Add this code to your LinkedIn profile headline or about section: ${code}`,
      verifyUrl: `/api/verify/linkedin/check/${userId}`
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Generate LinkedIn code error');
    res.status(500).json({ error: 'Failed to generate verification code' });
  }
});

// Check LinkedIn verification (manual review endpoint)
router.post('/linkedin/verify', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { linkedInProfileUrl } = req.body;
    
    // Update user with LinkedIn URL and mark as pending verification
    await query(
      `UPDATE users SET linkedin_url = $1, linkedin_verified = false WHERE id = $2`,
      [linkedInProfileUrl, userId]
    );
    
    // In production, you'd use a scraper or LinkedIn API to verify
    // For now, we'll create a verification request
    await query(
      `INSERT INTO verification_requests (user_id, type, data, status)
       VALUES ($1, 'linkedin', $2, 'pending')`,
      [userId, JSON.stringify({ linkedInProfileUrl })]
    );
    
    res.json({
      message: 'Verification request submitted',
      status: 'pending',
      note: 'Our team will verify your LinkedIn profile within 24 hours'
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'LinkedIn verification error');
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// Identity verification using document upload
router.post('/identity/upload', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { documentType, documentUrl } = req.body;
    
    // Store document for review
    await query(
      `INSERT INTO verification_documents (user_id, document_type, document_url, status)
       VALUES ($1, $2, $3, 'pending')`,
      [userId, documentType, documentUrl]
    );
    
    res.json({
      message: 'Document uploaded successfully',
      status: 'pending_review',
      note: 'Your document will be reviewed within 24-48 hours'
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Identity upload error');
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Company verification
router.post('/company/verify', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { startupId, verificationMethod, data } = req.body;
    
    // Check if user owns the company
    const companyResult = await query(
      'SELECT * FROM startups WHERE id = $1 AND created_by = $2',
      [startupId, userId]
    );
    
    if (companyResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this company' });
    }
    
    // Create verification request
    await query(
      `INSERT INTO company_verifications (startup_id, method, data, status, submitted_by)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [startupId, verificationMethod, JSON.stringify(data), userId]
    );
    
    // Update company to pending verification
    await query(
      "UPDATE startups SET verified = false WHERE id = $1",
      [startupId]
    );
    
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
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Company verification error');
    res.status(500).json({ error: 'Failed to submit company verification' });
  }
});

// Get verification status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    const userResult = await query(
      'SELECT linkedin_verified, identity_verified, email_verified FROM users WHERE id = $1',
      [userId]
    );
    
    const pendingDocs = await query(
      'SELECT * FROM verification_documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    const pendingRequests = await query(
      'SELECT * FROM verification_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({
      verifications: userResult.rows[0],
      pendingDocuments: pendingDocs.rows,
      pendingRequests: pendingRequests.rows
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get verification status error');
    res.status(500).json({ error: 'Failed to get verification status' });
  }
});

// Admin: Approve/reject verification
router.post('/admin/review', authenticate, async (req, res) => {
  try {
    const { requestId, type, action, notes } = req.body;
    
    // Check if user is admin
    const userResult = await query(
      "SELECT role FROM users WHERE id = $1",
      [req.userId]
    );
    
    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    if (type === 'identity') {
      const docResult = await query(
        'SELECT * FROM verification_documents WHERE id = $1',
        [requestId]
      );
      
      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const doc = docResult.rows[0];
      
      await query(
        `UPDATE verification_documents 
         SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, notes = $3
         WHERE id = $4`,
        [action, req.userId, notes, requestId]
      );
      
      if (action === 'approved') {
        await query(
          'UPDATE users SET identity_verified = true WHERE id = $1',
          [doc.user_id]
        );
      }
    } else if (type === 'linkedin') {
      const reqResult = await query(
        'SELECT * FROM verification_requests WHERE id = $1',
        [requestId]
      );
      
      if (reqResult.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      const request = reqResult.rows[0];
      
      await query(
        `UPDATE verification_requests 
         SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, notes = $3
         WHERE id = $4`,
        [action, req.userId, notes, requestId]
      );
      
      if (action === 'approved') {
        await query(
          'UPDATE users SET linkedin_verified = true WHERE id = $1',
          [request.user_id]
        );
      }
    }
    
    res.json({ message: `Verification ${action} successfully` });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Admin review error');
    res.status(500).json({ error: 'Failed to process review' });
  }
});

export default router;
