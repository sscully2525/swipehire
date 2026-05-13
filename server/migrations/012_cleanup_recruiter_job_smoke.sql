-- Cleanup production recruiter job-creation smoke accounts/jobs.
DELETE FROM startups
WHERE created_by IN (
  SELECT id FROM users
  WHERE email LIKE 'job-smoke-%@example.com'
     OR email LIKE 'final2-recruiter-%@example.com'
     OR email LIKE 'final-recruiter-%@example.com'
     OR email LIKE 'rate-test-%@example.com'
     OR email LIKE 'qa-hiring-%@example.com'
);
DELETE FROM users
WHERE email LIKE 'job-smoke-%@example.com'
   OR email LIKE 'final2-recruiter-%@example.com'
   OR email LIKE 'final-recruiter-%@example.com'
   OR email LIKE 'rate-test-%@example.com'
   OR email LIKE 'qa-hiring-%@example.com';
