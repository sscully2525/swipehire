-- Cleanup production messages-inbox verification accounts/jobs/messages.
DELETE FROM startups
WHERE created_by IN (
  SELECT id FROM users
  WHERE email LIKE 'inbox-rec-%@example.com'
     OR email LIKE 'inbox-cand-%@example.com'
     OR email LIKE 'cache-recruiter-%@example.com'
     OR email LIKE 'cache-candidate-%@example.com'
     OR email LIKE 'job-smoke-%@example.com'
     OR email LIKE 'final2-recruiter-%@example.com'
     OR email LIKE 'final-recruiter-%@example.com'
     OR email LIKE 'rate-test-%@example.com'
     OR email LIKE 'qa-hiring-%@example.com'
);
DELETE FROM users
WHERE email LIKE 'inbox-rec-%@example.com'
   OR email LIKE 'inbox-cand-%@example.com'
   OR email LIKE 'cache-recruiter-%@example.com'
   OR email LIKE 'cache-candidate-%@example.com'
   OR email LIKE 'job-smoke-%@example.com'
   OR email LIKE 'final2-recruiter-%@example.com'
   OR email LIKE 'final-recruiter-%@example.com'
   OR email LIKE 'rate-test-%@example.com'
   OR email LIKE 'qa-hiring-%@example.com';
