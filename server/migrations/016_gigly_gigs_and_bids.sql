-- 016_gigly_gigs_and_bids.sql
-- Gigly pivot, step 1: turn "jobs" into "gigs" with a price point, and add a
-- bids table so freelancers can commit to a gig with an offer.
--
-- Additive only — existing salary-based job rows keep working (pricing_type
-- defaults to 'salary'). The swipe/match engine is untouched; bids layer the
-- "swipe to discover, bid to commit" flow on top of it.

-- Gig pricing on the existing jobs table -------------------------------------
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS pricing_type      VARCHAR(20) DEFAULT 'salary',  -- 'salary' | 'fixed' | 'hourly'
  ADD COLUMN IF NOT EXISTS budget_min        INTEGER,                       -- gig price point (low end / fixed)
  ADD COLUMN IF NOT EXISTS budget_max        INTEGER,                       -- gig price point (high end, optional)
  ADD COLUMN IF NOT EXISTS budget_currency   VARCHAR(3)  DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS deadline          DATE,                          -- when the gig must be delivered
  ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100);                 -- e.g. "2 weeks", "8 hours"

-- Bids: a freelancer's offer to do a gig --------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             UUID NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount             INTEGER NOT NULL,                  -- the freelancer's offer
  currency           VARCHAR(3)  DEFAULT 'USD',
  pricing_type       VARCHAR(20) DEFAULT 'fixed',       -- 'fixed' | 'hourly'
  message            TEXT,                              -- pitch / cover note
  estimated_duration VARCHAR(100),
  status             VARCHAR(20) DEFAULT 'pending'
                       CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, user_id)                              -- one active bid per freelancer per gig
);

CREATE INDEX IF NOT EXISTS idx_bids_job    ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_user   ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
