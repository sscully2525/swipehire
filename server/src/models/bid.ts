import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bids — a freelancer's offer to do a gig. The "commit" half of Gigly's
 * "swipe to discover, bid to commit" flow. The swipe/match engine surfaces
 * gigs; a bid is how a freelancer puts a price on doing one.
 */
export interface Bid {
  id: string;
  job_id: string;
  user_id: string;
  amount: number;
  currency: string;
  pricing_type: 'fixed' | 'hourly';
  message?: string;
  estimated_duration?: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  created_at: Date;
  updated_at: Date;
}

export interface CreateBidInput {
  jobId: string;
  userId: string;
  amount: number;
  currency?: string;
  pricingType?: 'fixed' | 'hourly';
  message?: string;
  estimatedDuration?: string;
}

/**
 * Place (or re-place) a bid. A freelancer gets one active bid per gig — bidding
 * again overwrites the prior offer and resets it to 'pending'.
 */
export const createBid = async (input: CreateBidInput): Promise<Bid> => {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO bids (id, job_id, user_id, amount, currency, pricing_type, message, estimated_duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (job_id, user_id) DO UPDATE SET
       amount = EXCLUDED.amount,
       currency = EXCLUDED.currency,
       pricing_type = EXCLUDED.pricing_type,
       message = EXCLUDED.message,
       estimated_duration = EXCLUDED.estimated_duration,
       status = 'pending',
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      id,
      input.jobId,
      input.userId,
      input.amount,
      input.currency ?? 'USD',
      input.pricingType ?? 'fixed',
      input.message ?? null,
      input.estimatedDuration ?? null,
    ]
  );
  return result.rows[0];
};

/** All bids on a gig, newest first — with the bidding freelancer's basics. */
export const getBidsForGig = async (jobId: string): Promise<any[]> => {
  const result = await query(
    `SELECT b.*, u.first_name, u.last_name, u.title, u.avatar_url
     FROM bids b
     JOIN users u ON b.user_id = u.id
     WHERE b.job_id = $1
     ORDER BY b.created_at DESC`,
    [jobId]
  );
  return result.rows;
};

/** A freelancer's own bids, newest first — with gig title. */
export const getBidsByUser = async (userId: string): Promise<any[]> => {
  const result = await query(
    `SELECT b.*, j.title AS gig_title, j.startup_id
     FROM bids b
     JOIN jobs j ON b.job_id = j.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getBidById = async (id: string): Promise<Bid | null> => {
  const result = await query('SELECT * FROM bids WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

/** Update a bid's status (accept/decline by the gig owner; withdraw by the bidder). */
export const updateBidStatus = async (
  id: string,
  status: Bid['status']
): Promise<Bid | null> => {
  const result = await query(
    `UPDATE bids SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] ?? null;
};
