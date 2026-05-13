-- Cleanup additional production signup smoke-test accounts created while
-- reproducing recruiter signup failures/rate-limit behavior.
DELETE FROM startups
WHERE created_by IN (
  SELECT id FROM users
  WHERE email LIKE 'rate-test-%@example.com'
     OR email LIKE 'qa-hiring-%@example.com'
);
DELETE FROM users
WHERE email LIKE 'rate-test-%@example.com'
   OR email LIKE 'qa-hiring-%@example.com';
