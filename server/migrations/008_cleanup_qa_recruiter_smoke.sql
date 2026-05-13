-- Cleanup production smoke-test recruiter accounts created during API verification.
DELETE FROM startups
WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'qa-hiring-%@example.com');
DELETE FROM users WHERE email LIKE 'qa-hiring-%@example.com';
