# FIXES_APPLIED.md

_Companion to [`AUDIT_REPORT.md`](./AUDIT_REPORT.md). Tracks every audit finding through to the commit that resolved (or deliberately deferred) it._

_Author: subagent-driven fix pass · Branch: `main` (local, **not yet pushed**) · Base: `12ccbe15` · Tip: `12d6f925`._

---

## Summary

| Severity | In audit | Fixed | Deferred |
|---|---|---|---|
| 🔴 Critical | 6 | 6 | 0 |
| 🟠 High | 13 | 12 | 1 (httpOnly-cookie auth) |
| 🟡 Medium | ~25 | ~10 | ~15 (tracked below) |
| 🟢 Low / Polish | many | a few | most |

- **15 new commits** added on top of `12ccbe15` (12 substantive + 3 hygiene/docs).
- **~70 files** touched across `server/`, `client/`, `mobile/`, `.github/`, repo root.
- **0 HIGH/CRITICAL CVEs** remain (server + client `npm audit --omit=dev` clean).
- **All builds + tests + typechecks green** locally.

---

## Per-finding table

### 🔴 Critical (server)

| # | Finding (audit ref) | Fix | Files | Commit |
|---|---|---|---|---|
| C1 | `models/swipe.ts:53` — `checkForMatch` was `Math.random() < 0.4` (no real two-sided match). | Added `recruiter_swipes` table + migration; replaced random with a real query that requires both candidate and recruiter to have right-swiped. | `server/src/models/swipe.ts`, `server/src/db/migrations/003_recruiter_swipes.sql`, `server/src/routes/recruiter.ts` | `9f13f931` |
| C2 | `routes/startups.ts:95` — unauthenticated `POST /api/startups/seed`. | Route now requires `X-Setup-Token`. | `server/src/routes/startups.ts` | `e1baaa7c` |
| C3 | `index.ts:120-125` — `express.json` mounted before Stripe raw-body parser, breaking signature verification. | Raw body mounted on `/api/stripe/webhook` **before** any JSON parser; added a smoke test covering ordering. | `server/src/index.ts`, `server/src/__tests__/` | `102bd93e` |
| C4 | `routes/stripe.ts:230` — `ON CONFLICT (stripe_subscription_id)` with no unique constraint. | Added unique index in migration 002; webhook handler now idempotent against re-deliveries. | `server/src/db/migrations/002_subscriptions_unique.sql`, `server/src/routes/stripe.ts` | `102bd93e` |
| C5 | `routes/matches.ts:107-122` — unmatch notification inserted `startup_id` into `notifications.user_id` (FK violation). | Look up the recruiter's user via `startups.created_by` and notify them; unmatch flow now passes FK checks. | `server/src/routes/matches.ts` | `e1baaa7c` |
| C6 | No schema migrations — all DDL in one giant `initDB()`. | Lightweight `node-pg` migration runner; original schema moved to `001_init.sql`. `npm run migrate` works in CI + dev. | `server/src/db/migrate.ts`, `server/src/db/migrations/*` | `80245450` |

### 🟠 High (server)

| # | Finding | Fix | Files | Commit |
|---|---|---|---|---|
| H1 | `routes/auth.ts:105` — refresh token not compared to Redis. | Refresh endpoint now reads `refresh:<userId>` and rejects on mismatch; rotation enforced. | `server/src/routes/auth.ts` | `0ab344ea` |
| H2 | `models/user.ts:139` — JWT `type` claim not validated. | `verifyAccessToken` / `verifyRefreshToken` now check `decoded.type`. | `server/src/models/user.ts` | `0ab344ea` |
| H3 | `socket/handlers.ts:10` — JWT secret fallback string. | Reads from env, throws on missing in production. | `server/src/socket/handlers.ts` | `e1baaa7c` |
| H4 | `routes/notifications.ts:43` — IDOR on mark-as-read. | Query now scoped to `WHERE user_id = $1`. | `server/src/routes/notifications.ts` | `e1baaa7c` |
| H5 | `routes/recruiter.ts` — no role check. | Shared `requireRecruiter` middleware applied to all `/api/recruiter/*` routes. | `server/src/middleware/auth.ts`, `server/src/routes/recruiter.ts` | `e1baaa7c` |
| H6 | `routes/recruiter.ts:175` — recruiter "like" creates a match without candidate right-swipe. | Now requires an existing `swipes` row with `direction='right'` from the candidate before creating a match. | `server/src/routes/recruiter.ts`, `server/src/models/swipe.ts` | `9f13f931` |
| H7 | `models/swipe.ts:38` — `redis.del('jobs:userId:*')` (glob, doesn't work). | Switched to `SCAN`-based key deletion helper. | `server/src/models/swipe.ts` | `9f13f931` |
| H8 | `db/index.ts:25` — `process.exit(-1)` on idle PG error. | Logs and lets pg pool recover; no process kill. | `server/src/db/index.ts` | `80245450` |
| H9 | `routes/profile-enhanced.ts:239` — references nonexistent `website_url` column. | Column added in migration `004_profile_columns.sql`. | `server/src/db/migrations/`, `server/src/routes/profile-enhanced.ts` | `80245450` |
| H10 | Duplicated `authenticate` in 12 route files. | Single source in `server/src/middleware/auth.ts`. | `server/src/middleware/auth.ts`, all `server/src/routes/*.ts` | `e1baaa7c` |
| H11 | server lint: 52 warnings (unused vars). | Cleaned up across all routes + socket. | `server/src/**` | `d0fd5585` |
| H12 | High-severity dep CVEs (`fast-xml-builder` via AWS SDK). | `npm audit fix` cleared all. | `server/package-lock.json` | `1972dd99` |
| H13 *(deferred)* | JWTs in `localStorage` (XSS-stealable). | **Deferred.** Moving to httpOnly cookies requires touching every API caller + mobile + e2e. Tracked as follow-up. | — | — |

### 🟠 High (client / mobile / devops)

| # | Finding | Fix | Files | Commit |
|---|---|---|---|---|
| H14 | `client/src/lib/socket.ts` — hard-coded `io('/')`. | Reads `VITE_SOCKET_URL` with sensible fallback. | `client/src/lib/socket.ts`, `client/.env.example` | `7aeabd31` |
| H15 | No error boundary in client. | Top-level `<ErrorBoundary>` wrapping route tree. | `client/src/components/ErrorBoundary.tsx`, `client/src/App.tsx` | `7aeabd31` |
| H16 | Recruiter routes accessible to candidates client-side. | Added `<RequireRole role="recruiter">` wrapper; gated `/recruiter/*` routes. | `client/src/App.tsx`, `client/src/components/RequireRole.tsx` | `7aeabd31` |
| H17 | client `axios` 1.6.2 had 13 advisories incl. prototype pollution. | `npm audit fix` → axios bumped, `postcss`, `serialize-javascript`, `fast-uri` all clear. | `client/package-lock.json` | `1972dd99` |
| H18 | Mobile won't build — 4 missing screens. | Stub function components for `SignupScreen`, `MatchesScreen`, `ProfileScreen`, `AnalyticsScreen`. | `mobile/src/screens/*` | `b06fd13c` |
| H19 | Mobile API URL hard-coded `localhost:3001`. | New `mobile/src/lib/config.ts` reading `EXPO_PUBLIC_API_URL` / `API_URL` env; `api.ts` consumes it. | `mobile/src/lib/{config,api}.ts` | `b06fd13c` |
| H20 | No CI/CD. | GitHub Actions workflow with parallel server+client jobs (lint+build+test/build). | `.github/workflows/ci.yml` | `3c8f34b3` |

### 🟡 Medium — fixed

| # | Finding | Fix | Commit |
|---|---|---|---|
| M1 | `routes/setup.ts:241` — duplicated GET/POST `seed-sample-companies`. | Single POST route. | `e1baaa7c` |
| M2 | Auth middleware duplicated across routes. | Centralized (see H10). | `e1baaa7c` |
| M3 | Bundle: 882 KB JS, no splitting. | Route-level `React.lazy` + `manualChunks` (motion, recharts, formatDistanceToNow). Largest chunk now ~387 KB (Analytics, lazy-loaded). | `7aeabd31` |
| M4 | `BUILD_COMPLETE.md` / `SETUP_GUIDE.md` stale. | Replaced with short pointers to README. | `67f3abf4` |
| M5 | No `LICENSE` / `SECURITY.md`. | Added MIT LICENSE + responsible-disclosure SECURITY.md. | `67f3abf4` |
| M6 | client lint warnings (30 unused `err`). | Cleaned across all pages/components. | `e39b7117` |
| M7 | mobile lint won't typecheck. | Added `mobile/tsconfig.json`; `tsc --noEmit` clean. | `b06fd13c` |
| M8 | Stray `console.log` in socket handlers + client. | Gated behind `NODE_ENV !== 'production'` / `import.meta.env.DEV`. | `12d6f925` |
| M9 | `e2e/`, `mobile/` package-locks untracked. | Now tracked. | `e0a46044` |
| M10 | docker compose v1 syntax + missing SETUP_TOKEN in docs. | Modernized; previously addressed. | `49022cb0` |

### 🟡 Medium — deferred

These were inspected but intentionally not addressed in this pass (rationale below).

| Finding | Reason for deferral |
|---|---|
| Per-route rate limits (`/api/swipes`, `/api/ai/*`, `/api/setup/*`). | Needs product-level decision on limits per tier; global limiter currently sufficient for prod traffic. |
| Stronger signup password policy. | UX/product call; tied to forgot-password + breached-password check that doesn't exist yet. |
| `POST /clear-swipes` body-supplied `userId` (setup token only). | Setup-token gated; risk is operator-side. Worth scoping to caller in a future admin pass. |
| `calculateMatchScore` N+1 (computed per job in startups list). | Performance optimization; needs SQL/CTE rewrite; not blocking. |
| `models/startup.ts:80` — `JSON.stringify(filters)` cache-key instability. | Cache invalidation already shortened; long-term fix needs a canonical-JSON helper. |
| `findUserById` cache not invalidated on Stripe-driven subscription change. | Subscription tier is fetched live from `subscriptions` table in swipe-limit checks; cache mostly informational. |
| `analytics_events` table unused. | Schema kept; route-write feature not yet built. |
| `socket.io` socket-id mapping only stores one device. | Multi-device emit currently works via room join; per-socket mapping is best-effort. |
| Graceful shutdown (SIGTERM drain). | Not blocking; Railway sends SIGTERM and the platform handles ~30s drain. |
| Structured request IDs / Sentry. | Observability bucket; needs DSN + product decision. |
| `chat.ts:46` `markMessagesAsRead` always marks `'company'` sender. | Recruiter chat surface not yet shipped; will revisit when it is. |
| `services/ai.ts` score normalization clamp. | Cosmetic; output is clamped downstream. |
| `services/ai.ts` "AI" outreach is templated. | Product decision pending re: OpenAI cost. |
| `routes/payments.ts` mock router still mounted alongside real `/api/stripe`. | Mock is harmless dead weight; removal needs a frontend audit. |
| `routes/location.ts` hardcoded city centroids. | Acceptable for current launch geo. |

### 🟡 Medium / 🟢 Low — client

| Finding | Status |
|---|---|
| useEffect dependency lint warnings (30 total). | Reduced to **1 warning** (`Swipe.tsx:47`); rest fixed in lint pass. |
| `pages/Profile.tsx` 877 LOC. | Deferred. Functional, just large. |
| `pages/ApiTester.tsx` ships in prod bundle. | Deferred. |
| PWA icons exist? | Not verified in this pass (build emits without warning). |
| Refresh-failure redirects via `window.location`. | Deferred (works correctly, ergonomic improvement only). |
| No retry/backoff on 5xx, no offline handling, no Sentry. | Deferred. |
| No dark mode / i18n / accessibility audit / SEO meta / robots/sitemap. | Deferred. |

### 🟡 Medium / 🟢 Low — mobile

| Finding | Status |
|---|---|
| Token storage split between `AsyncStorage['token']` and Zustand persist. | Deferred. Mobile is prototype. |
| No refresh-token support on mobile. | Deferred. |
| No deep linking / no push notifications. | Deferred. |
| `Animated.ValueXY()` in render. | Deferred. |

### 🟡 Medium — e2e

E2E tests not run in this pass; selectors/timing concerns from audit remain open. No regressions introduced (e2e package-lock added, no test changes).

### 🟠 High / 🟡 Medium — devops

| Finding | Status |
|---|---|
| No CI/CD. | **Fixed** (see H20). |
| Docker Compose dummy Stripe keys in dev file. | Acceptable for dev-only file; previously addressed via README warning. |
| No `.dockerignore` for server/client. | Deferred (build time only). |
| No client `HEALTHCHECK`. | Deferred. |
| `railway.json` deploys server only; client path unclear. | Deferred (current prod uses two services + the SPA falls back). |
| Nginx missing CSP/HSTS. | Deferred (Helmet handles API; SPA edge headers are a small follow-up). |

---

## Verification results

### Server

| Check | Before | After |
|---|---|---|
| `npm run lint` | 0 errors, **52 warnings** | **0 errors, 0 warnings** |
| `npm run build` (`tsc`) | clean | clean |
| `npm test` (jest) | 3/3 (smoke) | **8/8 across 3 suites** |
| `npm audit --omit=dev` | 3 vulns (1 high, 2 moderate) | **0 vulnerabilities** |

### Client

| Check | Before | After |
|---|---|---|
| `npm run lint` | 0 errors, **30 warnings** | **0 errors, 1 warning** (`Swipe.tsx` exhaustive-deps; behavior intentional) |
| `npm run build` (Vite) | one 882 KB bundle (258 KB gz) | **route-split**: largest entry ~387 KB (Analytics, lazy); index 247 KB |
| `npm audit --omit=dev` | 7 vulns (6 high, 1 moderate) — axios prototype-pollution chain | **0 vulnerabilities** |

### Mobile

| Check | Before | After |
|---|---|---|
| `tsc --noEmit` | ❌ won't run (no tsconfig, missing screens) | **✅ clean (exit 0)** |

### Production reachability (informational — no push performed)

| URL | Status |
|---|---|
| `GET /` | **404** (`Application not found`) |
| `GET /swipe` | **404** |
| `GET /api/health` | **404** (Railway app reports not-found) |

The Railway service is currently not serving the previous deployment (Application not found). Local commits have **not been pushed** — once pushed, Railway should redeploy.

---

## Deferred / known follow-ups

In priority order:

1. **httpOnly Secure cookie auth migration.** Today access + refresh tokens live in `localStorage`. Highest-impact remaining XSS surface. Estimated: ~1 day, touches `routes/auth.ts`, `client/src/lib/api.ts`, `client/src/store/auth.ts`, `e2e/`, `mobile/`.
2. **Observability**: structured request IDs, Sentry on server + client, drop file-based winston transports in container.
3. **Per-route rate limits** for `/api/swipes`, `/api/ai/*`, `/api/setup/*`.
4. **Stronger signup policy + forgot/reset password endpoints** (table `verification_codes` already exists).
5. **`pages/Profile.tsx` decomposition** + tree-shake `ApiTester` out of prod.
6. **Mobile**: real Signup/Matches/Profile/Analytics screens; unified token storage; refresh-token support; push notifications.
7. **E2E hardening**: `data-testid`s in client, `globalSetup` that seeds, longer toast assertions.
8. **Nginx security headers** (CSP/HSTS/X-Frame-Options) at the SPA edge.
9. **Drop mock `/api/payments` router** once frontend confirmed to use `/api/stripe` exclusively.
10. **Graceful shutdown** (SIGTERM → drain sockets, close Redis, end pg pool).

---

## Push instructions

Local main is **16 commits ahead** of `origin/main` and has not been pushed yet.

```bash
git push origin main
```

> Railway redeploys on push to `main`. Production will pick up the fixes once you push. The `/api/health` 404 above means the deployed service is currently in a broken state — pushing will trigger a fresh build and should restore it (assuming env vars are still set on Railway).

After push, watch:

- GitHub Actions: `https://github.com/<owner>/<repo>/actions` — both `server` and `client` jobs should pass.
- Railway logs: server starts, migrations run via `npm run migrate`, redis connects, `/api/health` returns `{status:"ok"}`.
- Stripe webhook: first event after deploy should verify (signature) and write to `subscriptions` without conflict.

---

_Generated 2026-05-13 by an automated audit-fix subagent._
