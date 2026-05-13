import { query } from '../db';
import { redis } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface Swipe {
  id: string;
  user_id: string;
  job_id: string;
  direction: 'left' | 'right';
  ai_match_score?: number;
  created_at: Date;
}

export interface RecruiterSwipe {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  job_id: string;
  direction: 'left' | 'right';
  created_at: Date;
}

export interface Match {
  id: string;
  user_id: string;
  job_id: string;
  startup_id: string;
  status: 'pending' | 'contacted' | 'interview_scheduled' | 'hired' | 'rejected';
  user_interest_level?: number;
  company_interest_level?: number;
  scheduled_call_at?: Date;
  call_link?: string;
  notes?: string;
  created_at: Date;
}

/**
 * Best-effort cache invalidation for candidate job-feed keys. `DEL` does
 * not accept glob patterns, so we SCAN and delete in batches. Errors
 * are swallowed — caching is non-critical.
 *
 * Keep this version-tolerant: feed cache keys have changed from
 * `jobs:<userId>:...` to `jobs:vN:<userId>:...`; invalidation must clear
 * both, otherwise a refresh can resurrect a job the candidate already swiped.
 */
const invalidateJobsCacheForUser = async (userId: string): Promise<void> => {
  try {
    const patterns = [`jobs:${userId}:*`, `jobs:v*:${userId}:*`];
    for (const pattern of patterns) {
      let cursor = 0;
      do {
        // node-redis v4: scan returns { cursor, keys }
        const res = await (redis as any).scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = typeof res.cursor === 'number' ? res.cursor : Number(res.cursor);
        const keys: string[] = res.keys || [];
        if (keys.length) {
          await redis.del(keys);
        }
      } while (cursor !== 0);
    }
  } catch {
    /* cache best-effort */
  }
};

export const createSwipe = async (
  userId: string,
  jobId: string,
  direction: 'left' | 'right',
  aiMatchScore?: number
): Promise<Swipe> => {
  const id = uuidv4();

  const result = await query(
    `INSERT INTO swipes (id, user_id, job_id, direction, ai_match_score)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, job_id) 
     DO UPDATE SET direction = $4, ai_match_score = $5, created_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [id, userId, jobId, direction, aiMatchScore]
  );

  await invalidateJobsCacheForUser(userId);

  return result.rows[0];
};

/**
 * Record a recruiter swipe on a candidate (for a specific job). Used by
 * the recruiter dashboard's like/pass actions; a match is only created
 * when both sides have swiped right.
 */
export const createRecruiterSwipe = async (
  recruiterId: string,
  candidateId: string,
  jobId: string,
  direction: 'left' | 'right'
): Promise<RecruiterSwipe> => {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO recruiter_swipes (id, recruiter_id, candidate_id, job_id, direction)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (recruiter_id, candidate_id, job_id)
     DO UPDATE SET direction = $5, created_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [id, recruiterId, candidateId, jobId, direction]
  );
  return result.rows[0];
};

/**
 * Returns true iff the candidate has a `right` swipe on this job AND the
 * job's owning recruiter has a `right` swipe on the candidate for this job.
 */
export const checkForMatch = async (
  candidateId: string,
  jobId: string
): Promise<boolean> => {
  const result = await query(
    `SELECT 1
       FROM swipes s
       JOIN jobs j ON j.id = s.job_id
       JOIN startups st ON st.id = j.startup_id
       JOIN recruiter_swipes rs
         ON rs.candidate_id = s.user_id
        AND rs.job_id = s.job_id
        AND rs.direction = 'right'
        AND rs.recruiter_id = st.created_by
      WHERE s.user_id = $1
        AND s.job_id = $2
        AND s.direction = 'right'
      LIMIT 1`,
    [candidateId, jobId]
  );
  return result.rows.length > 0;
};

/**
 * Did the recruiter already swipe right on this candidate for this job?
 * Used when a recruiter swipes first; if the candidate then right-swipes
 * we have a mutual match.
 */
export const candidateHasRightSwipe = async (
  candidateId: string,
  jobId: string
): Promise<boolean> => {
  const result = await query(
    `SELECT 1 FROM swipes
      WHERE user_id = $1 AND job_id = $2 AND direction = 'right'
      LIMIT 1`,
    [candidateId, jobId]
  );
  return result.rows.length > 0;
};

export const createMatch = async (userId: string, jobId: string): Promise<Match> => {
  // Get startup_id from job
  const jobResult = await query('SELECT startup_id FROM jobs WHERE id = $1', [jobId]);
  const startupId = jobResult.rows[0]?.startup_id;

  const id = uuidv4();

  const result = await query(
    `INSERT INTO matches (id, user_id, job_id, startup_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (user_id, job_id) DO NOTHING
     RETURNING *`,
    [id, userId, jobId, startupId]
  );

  if (result.rows.length === 0) {
    // Match already exists, fetch it
    const existing = await query(
      'SELECT * FROM matches WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );
    return existing.rows[0];
  }

  // Create notification for the candidate
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, 'match', 'New Match!', 'You matched with a startup!', $2)`,
    [userId, JSON.stringify({ matchId: result.rows[0].id, jobId })]
  );

  // Notify the recruiter who owns the startup (look up users.id from
  // startups.created_by — startup_id is a startup row, NOT a user id).
  const recruiterRow = await query(
    'SELECT created_by FROM startups WHERE id = $1',
    [startupId]
  );
  const recruiterUserId = recruiterRow.rows[0]?.created_by;
  if (recruiterUserId) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'match', 'New Match!', 'A candidate matched with one of your jobs.', $2)`,
      [recruiterUserId, JSON.stringify({ matchId: result.rows[0].id, jobId })]
    );
  }

  return result.rows[0];
};

export const getUserMatches = async (userId: string): Promise<any[]> => {
  const result = await query(
    `SELECT m.*, s.name as startup_name, s.logo_url as startup_logo, 
            s.slug as startup_slug, s.verified as startup_verified,
            j.title as job_title, j.salary_min, j.salary_max, 
            j.location as job_location, j.remote_allowed,
            (SELECT COUNT(*) FROM chat_messages WHERE match_id = m.id AND sender_type = 'company' AND read_at IS NULL) as unread_count
     FROM matches m
     JOIN startups s ON m.startup_id = s.id
     JOIN jobs j ON m.job_id = j.id
     WHERE m.user_id = $1
     ORDER BY m.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getMatchById = async (matchId: string): Promise<any> => {
  const result = await query(
    `SELECT m.*, s.name as startup_name, s.logo_url as startup_logo,
            j.title as job_title, u.first_name as user_first_name, u.last_name as user_last_name
     FROM matches m
     JOIN startups s ON m.startup_id = s.id
     JOIN jobs j ON m.job_id = j.id
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1`,
    [matchId]
  );
  return result.rows[0] || null;
};

export const updateMatchStatus = async (matchId: string, status: string, updates?: any): Promise<void> => {
  const fields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const values: any[] = [status];
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

  await query(
    `UPDATE matches SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
};

export const getRemainingSwipes = async (userId: string, dailyLimit: number): Promise<number> => {
  const result = await query(
    `SELECT $1 - COUNT(*) as remaining
     FROM swipes 
     WHERE user_id = $2 
       AND created_at > CURRENT_DATE
       AND direction = 'right'`,
    [dailyLimit, userId]
  );

  return Math.max(0, result.rows[0]?.remaining || dailyLimit);
};

export const getSwipeStats = async (userId: string): Promise<any> => {
  const result = await query(
    `SELECT 
       COUNT(*) FILTER (WHERE direction = 'right') as right_swipes,
       COUNT(*) FILTER (WHERE direction = 'left') as left_swipes,
       COUNT(*) FILTER (WHERE direction = 'right' AND created_at > CURRENT_DATE) as today_right_swipes
     FROM swipes 
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
};
