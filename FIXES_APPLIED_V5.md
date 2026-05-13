# Fixes Applied V5 — Recruiter Job Creation

## Root cause
- Recruiter job creation accepted only one narrow payload shape and inserted `requirements`/`responsibilities` directly into PostgreSQL `TEXT[]` columns.
- The Companies page sends those fields as textarea strings, which can trigger array-literal/database errors.
- The Dashboard page also posted to legacy `/api/recruiter/jobs`, but only `/api/recruiter/companies/:id/jobs` existed.

## Fixes
- Added robust recruiter job payload normalization:
  - accepts camelCase and snake_case fields
  - converts comma/newline strings into `TEXT[]`
  - converts numeric strings into numbers/null
  - validates required title/description
  - validates min salary <= max salary
  - defaults remote/work flags safely
- Added backward-compatible `POST /api/recruiter/jobs` for the dashboard, creating under the requested `companyId` or the recruiter’s first company.
- Added structured error logging for recruiter job creation failures.

## Verification
- Server lint ✅
- Server build ✅
- Server tests 17/17 ✅
- Client lint/build ✅
- Production smoke: recruiter signup 201 ✅
- Production smoke: `POST /api/recruiter/companies/:id/jobs` 201 ✅
- Production smoke: legacy `POST /api/recruiter/jobs` 201 ✅
- Production smoke: company job list returned both created jobs with normalized requirements arrays ✅
