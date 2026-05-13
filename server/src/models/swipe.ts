import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface Swipe {
  id: string;
  user_id: string;
  job_id: string;
  direction: 'left' | 'right';
  ai_match_score?: number;
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
  
  // No per-user job cache to invalidate here
  
  return result.rows[0];
};

export const checkForMatch = async (userId: string, jobId: string): Promise<boolean> => {
  // A match exists when the company has already liked this candidate via recruiter route
  // (company_interest_level set > 0 on an existing match record)
  const result = await query(
    `SELECT id FROM matches
     WHERE user_id = $1 AND job_id = $2 AND company_interest_level IS NOT NULL`,
    [userId, jobId]
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
  
  // Create notification for user
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, 'match', 'New Match!', 'You matched with a startup!', $2)`,
    [userId, JSON.stringify({ matchId: result.rows[0].id, jobId })]
  );
  
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