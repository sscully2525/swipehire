# Fixes Applied V4 — Demo Data, Hiring Signup, API Hardening

## Demo/fake company cleanup
- Added `is_demo` and `source` flags to `startups` via migration `006_demo_data_flags.sql`.
- Marked known seeded/sample companies as demo data, including setup fixtures and legacy rich seed fixtures, by both slug and name to catch older production seed runs.
- Candidate swipe feed now excludes demo-company jobs.
- Direct job lookup, startup filters, and location/map APIs now exclude demo companies.
- Seed/sample setup endpoints are dev-only/admin-only and no longer provide a production path for adding fake companies.

## Hiring/recruiter account creation
- Made recruiter signup create the recruiter user and company in one database transaction.
- Added collision-safe company slug generation.
- Ensured recruiter-created companies are marked `is_demo = false`, `source = 'user'`.
- Updated the recruiter signup UI to match server password policy and show password strength instead of accepting weak passwords that the API rejects.
- Added field `name` attributes for better browser autofill/E2E stability.

## API audit/hardening
- Found current production location APIs returning 500 due older DBs missing `lat`/`lng`; migration now backfills those columns with `ADD COLUMN IF NOT EXISTS`.
- Fixed Docker production packaging so `server/migrations/` is copied into the Railway image and startup migrations actually run before serving traffic.
- Removed stale/dangerous API tester entries that pointed at setup/seed endpoints and fixed auth signup path references.
- Added tests proving demo-company jobs are excluded from candidate feed and direct job lookup.
- Continued structured logging cleanup across older route files (`profile`, `profile-enhanced`, `stripe`, `verification`, `matches`, `swipes`, `admin`).

## Verification
- Server: lint ✅, build ✅, tests 17/17 ✅, production-dependency audit 0 vulnerabilities ✅
- Client: lint ✅, build ✅, production-dependency audit 0 vulnerabilities ✅
- Mobile: TypeScript check ✅
- Production pre-deploy API smoke found location endpoint failures; migration plus Docker packaging fix included to apply the fix on deploy.
- Production post-deploy hiring signup smoke returned 201 and recruiter dashboard returned 200; QA smoke account cleanup migration added.
