-- One-time test reset requested by owner: reset today's swipe allowance for all
-- existing accounts without deleting swipe history or matches. Moving today's
-- swipes before CURRENT_DATE makes /api/swipes/remaining return a fresh daily
-- allowance while preserving historical analytics.
UPDATE swipes
SET created_at = CURRENT_DATE - INTERVAL '1 second'
WHERE created_at >= CURRENT_DATE;
