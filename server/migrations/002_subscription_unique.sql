-- 002_subscription_unique.sql
-- Add the unique constraint required by the Stripe webhook upsert
-- (`ON CONFLICT (stripe_subscription_id)`).

-- Best effort: collapse any existing duplicates first (keep the most recent row).
DELETE FROM subscriptions s
USING subscriptions s2
WHERE s.stripe_subscription_id IS NOT NULL
  AND s.stripe_subscription_id = s2.stripe_subscription_id
  AND s.created_at < s2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_sub_id_uniq
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
