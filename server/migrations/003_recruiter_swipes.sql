-- 003_recruiter_swipes.sql
-- Recruiter-side swipes. A "match" requires a right-swipe from both
-- the candidate (swipes table) AND the recruiter who owns the job
-- (this table).

CREATE TABLE IF NOT EXISTS recruiter_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recruiter_id, candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_swipes_recruiter ON recruiter_swipes(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_swipes_candidate_job ON recruiter_swipes(candidate_id, job_id);
