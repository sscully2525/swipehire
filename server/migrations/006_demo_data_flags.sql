-- Mark seeded/demo companies so production APIs can hide them from real users,
-- and backfill columns expected by location/demo-aware routes on older DBs.
ALTER TABLE startups ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'user';
ALTER TABLE startups ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8);
ALTER TABLE startups ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Existing recruiter-created companies may have NULL source on older DBs.
UPDATE startups SET source = 'user', is_demo = FALSE WHERE created_by IS NOT NULL;

-- Known setup/seed fixtures should never appear in production candidate feeds.
UPDATE startups
SET is_demo = TRUE, source = 'demo'
WHERE slug = ANY(ARRAY[
  'techflow','cloudnine','datapulse','securenet','greenenergy','healthsync','fintech-pro','edulearn','logistics-ai','retailtech','mediastream','devtools-co','cryptovault','smartcity','agritech','spacexplore','biogen-tech','legaltech','gamestudio','musicai','traveltech','fooddelivery','realestate-ai','fashiontech','sportstech','newsmedia','jobmatch','eventtech','autodrive','dronetech','robotics-co','voiceai','chatbot-pro','codeassist','designai','marketing-pro','salestech','supporthub','hr-tech','payroll-pro','inventory-ai','quality-control','manufacturing-ai','supply-chain-pro','warehouse-tech','fleet-management','insurance-tech','banking-api','investment-ai','credit-score','blockchain-co',
  'neonlabs','cloudforge','greenstack','healthtech-ai','grand-ventures'
]);

-- Remove QA recruiter-signup smoke-test records created by deployment verification.
DELETE FROM startups
WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'qa-hiring-%@example.com');
DELETE FROM users WHERE email LIKE 'qa-hiring-%@example.com';
