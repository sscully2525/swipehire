-- Migration 005 — password reset
-- Add columns to verification_codes to support hashed reset codes and a
-- `purpose` discriminator (so the new flow doesn't conflict with the
-- existing email/phone verification flow which uses `type`).

ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS code_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(50);

-- Allow nulls in legacy columns when populating the new ones.
ALTER TABLE verification_codes
  ALTER COLUMN code DROP NOT NULL,
  ALTER COLUMN type DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_codes_purpose
  ON verification_codes(user_id, purpose, expires_at);
