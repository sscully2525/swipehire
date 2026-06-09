import { Router, Request, Response } from 'express';
import {
  createBid,
  getBidsForGig,
  getBidsByUser,
  getBidById,
  updateBidStatus,
} from '../models/bid';
import { authenticate } from '../middleware/auth';
import { createMatch } from '../models/swipe';
import { createNotification } from '../models/notification';
import { sendBidAcceptedEmail, sendBidDeclinedEmail, sendNewBidEmail } from '../services/email';
import { query } from '../db';
import { logger } from '../logger';

const router = Router();

const APP_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const formatAmount = (amount: number, pricingType?: string) =>
  `$${Number(amount).toLocaleString()}${pricingType === 'hourly' ? '/hr' : ''}`;

/**
 * Does this user own the gig (the startup that posted the job)? Gig owners are
 * the only ones allowed to view all bids on a gig and accept/decline them.
 */
const userOwnsGig = async (jobId: string, userId: string): Promise<boolean> => {
  const result = await query(
    `SELECT 1
     FROM jobs j
     JOIN startups s ON j.startup_id = s.id
     WHERE j.id = $1 AND s.created_by = $2`,
    [jobId, userId]
  );
  return result.rows.length > 0;
};

// Place (or update) a bid on a gig — freelancer side.
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { jobId, amount, currency, pricingType, message, estimatedDuration } = req.body;

    if (!jobId || amount == null || Number(amount) <= 0) {
      return res.status(400).json({ error: 'jobId and a positive amount are required' });
    }
    if (pricingType && !['fixed', 'hourly'].includes(pricingType)) {
      return res.status(400).json({ error: 'pricingType must be "fixed" or "hourly"' });
    }

    const gig = await query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (gig.rows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    // Can't bid on your own gig.
    if (await userOwnsGig(jobId, req.userId!)) {
      return res.status(403).json({ error: 'You cannot bid on your own gig' });
    }

    // Re-bidding only overwrites a *pending* offer. Once a bid is decided
    // (accepted/declined) it's final — otherwise a freelancer could silently
    // reset an accepted deal back to pending with a new amount.
    const existing = await query(
      'SELECT status FROM bids WHERE job_id = $1 AND user_id = $2',
      [jobId, req.userId]
    );
    const priorStatus = existing.rows[0]?.status;
    if (priorStatus && priorStatus !== 'pending' && priorStatus !== 'withdrawn') {
      return res.status(409).json({ error: `Your bid on this gig was already ${priorStatus}` });
    }

    const bid = await createBid({
      jobId,
      userId: req.userId!,
      amount: Math.round(Number(amount)),
      currency,
      pricingType,
      message,
      estimatedDuration,
    });

    // Tell the gig owner (best-effort, after responding is fine but we're
    // already async — fire and forget so email latency never blocks the bid).
    query(
      `SELECT j.title AS gig_title, owner.email AS owner_email, owner.id AS owner_id,
              bidder.first_name AS bidder_name
       FROM jobs j
       JOIN startups s ON j.startup_id = s.id
       JOIN users owner ON s.created_by = owner.id
       JOIN users bidder ON bidder.id = $2
       WHERE j.id = $1`,
      [jobId, req.userId]
    )
      .then(async (r) => {
        const row = r.rows[0];
        if (!row) return;
        await createNotification(
          row.owner_id,
          'new_bid',
          'New bid on your gig',
          `${row.bidder_name} bid ${formatAmount(bid.amount, bid.pricing_type)} on "${row.gig_title}"`,
          { bidId: bid.id, jobId }
        );
        await sendNewBidEmail(
          row.owner_email, row.gig_title, row.bidder_name,
          formatAmount(bid.amount, bid.pricing_type), APP_URL
        );
      })
      .catch((err) => logger.warn({ err, jobId }, 'New-bid notify failed'));

    res.status(201).json(bid);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Create bid error');
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// The current freelancer's own bids.
router.get('/mine', authenticate, async (req: Request, res: Response) => {
  try {
    const bids = await getBidsByUser(req.userId!);
    res.json(bids);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get my bids error');
    res.status(500).json({ error: 'Failed to load bids' });
  }
});

// All bids on a gig — gig owner only.
router.get('/gig/:jobId', authenticate, async (req: Request, res: Response) => {
  try {
    if (!(await userOwnsGig(req.params.jobId, req.userId!))) {
      return res.status(403).json({ error: 'Not authorized to view bids on this gig' });
    }
    const bids = await getBidsForGig(req.params.jobId);
    res.json(bids);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Get gig bids error');
    res.status(500).json({ error: 'Failed to load bids' });
  }
});

// Accept or decline a bid — gig owner only.
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'status must be "accepted" or "declined"' });
    }

    const bid = await getBidById(req.params.id);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }
    if (!(await userOwnsGig(bid.job_id, req.userId!))) {
      return res.status(403).json({ error: 'Not authorized to decide this bid' });
    }

    const updated = await updateBidStatus(req.params.id, status);

    // An accepted bid is the deal: open the chat channel by creating a match
    // (idempotent — reuses an existing one) and tell the freelancer.
    const freelancer = await query(
      `SELECT u.email, j.title AS gig_title FROM users u, jobs j
       WHERE u.id = $1 AND j.id = $2`,
      [bid.user_id, bid.job_id]
    );
    const fEmail = freelancer.rows[0]?.email;
    const gigTitle = freelancer.rows[0]?.gig_title || 'your gig';

    if (status === 'accepted') {
      const match = await createMatch(bid.user_id, bid.job_id);
      await createNotification(
        bid.user_id,
        'bid_accepted',
        'Bid accepted! 🎉',
        'Your bid was accepted — the chat is now open to work out the details.',
        { bidId: bid.id, jobId: bid.job_id, matchId: match?.id }
      );
      if (fEmail) sendBidAcceptedEmail(fEmail, gigTitle, APP_URL).catch(() => {});
    } else {
      await createNotification(
        bid.user_id,
        'bid_declined',
        'Bid declined',
        'Your bid on a gig was declined. Keep exploring — more gigs are waiting.',
        { bidId: bid.id, jobId: bid.job_id }
      );
      if (fEmail) sendBidDeclinedEmail(fEmail, gigTitle, APP_URL).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Update bid status error');
    res.status(500).json({ error: 'Failed to update bid' });
  }
});

// Withdraw your own bid — freelancer side.
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const bid = await getBidById(req.params.id);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }
    if (bid.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not your bid' });
    }
    const updated = await updateBidStatus(req.params.id, 'withdrawn');
    res.json(updated);
  } catch (err) {
    logger.error({ err, userId: req.userId }, 'Withdraw bid error');
    res.status(500).json({ error: 'Failed to withdraw bid' });
  }
});

export default router;
