# SwipeHire — Codebase Audit Report

_Audit date: 2026-05-13 · Branch: `main` @ `49022cb0` · Auditor: subagent (read every source file under `server/src`, `client/src`, `mobile/`, `e2e/`, plus all configs/Dockerfiles/compose/docs)._

---

## Executive summary

1. **Production is up and the basic stack works.** `https://swipehire-production-c0a5.up.railway.app/` → 200, `/api/health` returns `{"status":"ok","redis":"connected","version":"2.0.0"}`, `/swipe` 200, login endpoint reachable. Server build + smoke tests + client build all pass.
2. **The core "match" logic is fake.** `models/swipe.ts:55` — `checkForMatch` is literally `Math.random() < 0.4`. Nothing actually checks whether a recruiter expressed interest; matches are coin-flipped server-side. For a Tinder-style product this is the single most important business bug.
3. **Stripe webhook is broken two ways.**  (a) `index.ts:124` mounts `express.json()` *before* `express.raw()` on `/api/stripe/webhook`, so signature verification will fail on real production deliveries. (b) The `INSERT … ON CONFLICT (stripe_subscription_id) DO UPDATE` in `routes/stripe.ts:232` references a column with **no unique constraint** in the `subscriptions` schema, so the statement throws at runtime.
4. **`/api/startups/seed` is completely unauthenticated** (`routes/startups.ts:95`). Anyone on the internet can hit it and (re)seed the database. Several `/api/setup/*` flows are correctly gated by `SETUP_TOKEN`, but this one slipped through.
5. **Notification ownership bug.** `routes/notifications.ts:43` lets any authenticated user mark *anyone's* notification as read — no `WHERE user_id = $1` check. Same shape for `unmatch` (`routes/matches.ts:113`) which inserts a notification into `notifications.user_id` using a **startup_id**, violating the FK and crashing the request (or, worse, creating orphans if FKs are ever relaxed).
6. **Recruiter API has no role check.** Every `/api/recruiter/*` route in `routes/recruiter.ts` only checks "is authenticated"; a regular candidate can `POST /api/recruiter/companies`, like candidates, etc. Ownership-by-`created_by` partially limits damage but not creation.
7. **Mobile app does not build.** `mobile/App.tsx:8` imports `./src/screens/SignupScreen` and `mobile/src/navigation/MainTabs.tsx:4-6` imports `MatchesScreen`, `ProfileScreen`, `AnalyticsScreen` — **none of those files exist**. The "mobile" tree is two-screen scaffolding only. README is honest about this ("unfinished prototype").
8. **Auth/session hygiene gaps.** Refresh-token rotation isn't enforced (`routes/auth.ts:107` accepts any non-expired refresh token, doesn't compare to the value stored in Redis); `verifyAccessToken` doesn't validate the `type` claim, so a refresh token signed with the access secret would verify (low risk since secrets differ, but the invariant is implicit). JWTs live in `localStorage` via Zustand persist → XSS-stealable.
9. **High-severity dep CVEs.** `client` axios 1.6.2 has 13 advisories (auth-bypass via prototype pollution, SSRF, etc.); server has `fast-xml-builder` high via AWS SDK. `npm audit fix` claims it can patch both. Mobile is many majors behind on Expo (mostly cosmetic given mobile doesn't build).
10. **Massive scope gaps for a real product.** No email verification, no password reset, no account deletion, no rate-limit on signup endpoint beyond the 10/h auth limiter, no image/file uploads (resume/avatar are URL-only), no real geocoder, no push notifications, no analytics event ingestion endpoint, no GDPR/export, no error boundaries, no accessibility passes, no SEO meta, no robots.txt/sitemap, no migrations (everything is `CREATE TABLE IF NOT EXISTS` plus ad-hoc ALTERs implied — see "website_url" referenced in profile-enhanced.ts but never created in `initDB`).

---

## Production reachability check

| URL | Status |
|---|---|
| `GET /` | 200 (SPA) |
| `GET /swipe` | 200 (SPA fallback) |
| `GET /api/health` | 200 — `{status:"ok", redis:"connected", version:"2.0.0"}` |
| `GET /api/auth/login` | 200 (returns SPA `index.html`) — implies the Railway service is serving the SPA AND the API on the same origin; the SPA wildcard route swallows non-matching API paths. Worth confirming this is intentional. |

✅ Prod is alive; the API responds, Redis is connected.

---

## Build / lint / test results

| Package | Install | Lint | Build | Tests |
|---|---|---|---|---|
| `server/` | ✅ | ✅ 0 errors, **52 warnings** (unused vars) | ✅ `tsc` clean | ✅ 3/3 jest smoke pass |
| `client/` | ✅ | ✅ 0 errors, **30 warnings** (unused err, exhaustive-deps) | ✅ Vite build OK, **bundle 882 KB (258 KB gz) – no code splitting** | n/a (script is a no-op) |
| `mobile/` | ✅ install | ❌ Would not typecheck/build: missing screen modules (see Findings → Mobile) | not run | none |
| `e2e/` | ✅ install (Playwright not exec'd) | n/a | n/a | not run |

### npm audit (`--omit=dev`)

- **server**: 1 high (`fast-xml-builder` via `@aws-sdk/xml-builder`), 2 moderate. `npm audit fix` available.
- **client**: 1 high (`axios` 1.6.2 — 13 chained advisories including auth-bypass via prototype pollution, SSRF, header injection, CRLF, prototype-pollution gadgets). Update to ≥ 1.12.x via `npm audit fix`.
- **mobile**: 27+ vulns through stale Expo 49 / `@xmldom/xmldom` tree; needs `expo` upgrade (breaking).

---

## Findings — Server (`server/src/`)

### 🔴 Critical

- **`models/swipe.ts:53-56` — fake match logic.** `checkForMatch` is `return Math.random() < 0.4;` with a TODO-shaped comment. There is no actual recruiter-side swipe table. For a Tinder product, this is the product, and it does not exist on the candidate side.
- **`routes/startups.ts:95-103` — unauthenticated seed endpoint.** `POST /api/startups/seed` has no auth/role/setup-token guard and runs `seedStartupsAndJobs()` against prod data. Plus `models/startup.ts:170+` includes ~600 lines of hard-coded seed fixtures.
- **`index.ts:120-125` — Stripe raw-body ordering.** `express.json({limit:'1mb'})` is registered before the `/api/stripe/webhook` raw-body parser. Express body-parser short-circuits once a body type matches; signature verification (which needs the byte-exact raw payload) will fail in prod. Mount `app.use('/api/stripe/webhook', express.raw({type:'application/json'}))` *before* any json/urlencoded middleware.
- **`routes/stripe.ts:230-240` — `ON CONFLICT (stripe_subscription_id)` with no unique constraint.** `subscriptions` schema (`db/index.ts:172-185`) defines no unique index on `stripe_subscription_id`; PG will throw `there is no unique or exclusion constraint matching the ON CONFLICT specification`. The webhook handler will 500 on every paid checkout.
- **`routes/matches.ts:107-122` — broken unmatch notification.** Inserts `match.startup_id` into `notifications.user_id`, which is `REFERENCES users(id)`. With FK on, the unmatch DELETE never runs because the prior INSERT raises. Should notify the recruiter user via `startups.created_by`, not the startup id.

### 🟠 High

- **`routes/auth.ts:105-118` — refresh rotation not enforced.** `verifyRefreshToken` only checks the signature/expiry; it doesn't compare against the token stored in Redis (`refresh:<userId>`), so an attacker with one captured refresh token can keep minting access tokens for 7 days even after a legitimate logout (which only clears the Redis side). Fix: compare against `redis.get('refresh:'+userId)` and reject if mismatch.
- **`models/user.ts:139-148` — JWT type-claim not validated.** `verifyAccessToken` will happily accept any token signed with `JWT_SECRET`, including (theoretically) one minted with `type:'refresh'` if you mixed secrets. Check `decoded.type === 'access'` in the helper.
- **`socket/handlers.ts:10` — `JWT_SECRET` fallback.** Socket auth falls back to `'your-secret-key-change-in-production'` if env is unset. The production check in `index.ts:36-62` guards startup, so in prod this can never bite; in dev it bites silently. Use the same env-required pattern as `models/user.ts`.
- **`routes/notifications.ts:43-50` — IDOR on mark-as-read.** `markNotificationAsRead(req.params.id)` doesn't filter by `user_id`. Any authenticated user can mark any other user's notifications as read.
- **`routes/recruiter.ts` — no role check anywhere.** A regular candidate can `POST /companies`, `POST /companies/:id/jobs`, list "their" candidates etc. Combined with the `recruiter/signup` flow (which seeds a startup automatically), there's no `requireRecruiter` middleware.
- **`routes/recruiter.ts:175-201` — recruiter "like candidate" doesn't require candidate's right swipe.** A recruiter can create a match against any user_id regardless of whether that user has expressed interest. Should require an existing right-swipe row (see `WHERE NOT EXISTS …` candidates query at line 134, which already encodes the right semantics).
- **`models/swipe.ts:38-44` — broken Redis cache invalidation.** `await redis.del(\`jobs:${userId}:*\`)` — `DEL` does not support glob patterns. Cache is never invalidated when a user swipes, so filter changes return stale lists for 5 minutes.
- **`db/index.ts:25-28` — `process.exit(-1)` on idle client error.** Any transient PG error in an idle client kills the whole process. Should log and let pg recreate the connection.
- **`routes/profile-enhanced.ts:239-258` — references `website_url` column that doesn't exist** in `users` per `db/index.ts` schema. The `UPDATE … SET website_url = COALESCE($9, website_url)` will throw "column does not exist" the first time anyone hits `PUT /api/profile-enhanced/basic`.

### 🟡 Medium

- **`index.ts:108-117` — single global rate limit (100/15m) and a 10/h auth limit, but no per-route limits on `/api/swipes` (cheap), `/api/ai/*` (expensive), or `/api/setup/*` (potential abuse).** The 10/h limit is also too tight for shared NAT'd users (looks like the test suite hits login many times per minute).
- **`routes/auth.ts:27-31` — signup password policy is just `min: 8`.** No complexity, no breach check, no leak protection. At least require digit + letter + length 10.
- **Auth middleware duplicated in 12 files.** `routes/{swipes,matches,profile,profile-enhanced,chat,analytics,ai,admin,payments,stripe,recruiter,notifications,startups,verification}.ts` each redefine the same 15-line `authenticate` function. Refactor into `middleware/auth.ts`.
- **`routes/setup.ts:241-378` — `seed-sample-companies` is duplicated as both `GET` and `POST` with identical bodies.** Pick one (POST) and dedupe.
- **`routes/setup.ts:425-431` — `POST /clear-swipes` takes a `userId` from the request body** with no token-bound check. Anyone with the setup token can wipe any user's swipes. Add an admin check or scope to the calling admin.
- **`routes/swipes.ts:62` — `calculateMatchScore` is computed twice per swipe** (once in handler, once via `getRecommendations`/list elsewhere) and once *per job* in `routes/startups.ts:34-40` — classic N+1. Move scoring into SQL or batch it.
- **`models/startup.ts:80-93` — cache key uses `JSON.stringify(filters)`** which is not stable for object key order. Different ordering → cache miss; multiple filter combos blow up Redis. Use a sorted JSON or hash.
- **`models/user.ts:73-87` — `findUserById` caches the full user row for 1 hour** but cache is only invalidated on `updateUser` (allowed-fields path). Subscription tier changes via Stripe webhook (`routes/stripe.ts:243`) bypass that, so swipe limits stay wrong until the cache expires.
- **`routes/verification.ts` — no role check on `POST /admin/review`.** The route checks role manually inline (line 207-214) but mounts under `/api/verify/admin/review` and trusts the request. It does check role correctly, but the doubled pattern with `routes/admin.ts`'s `requireAdmin` shows the project is half-way through extracting middleware.
- **`routes/admin.ts:36-37` — empty catch + 500.** Logs nothing and returns generic error; combined with disabled `error` arg (lint warning), debugging in prod will be hard. Add `logger.error`.
- **`db/index.ts:46-373` — all schema lives in one giant `initDB`** with no migrations or versioning. Cannot evolve in prod without manual SQL. Adopt `node-pg-migrate` or `drizzle-kit`.
- **`db/index.ts` — only `(user_id)` indexes**; `swipes` lookup by `(user_id, created_at, direction='right')` for the daily-limit count would benefit from a covering index. Same for `matches.user_id` already exists but `matches(startup_id, status)` for recruiter dashboards isn't indexed.
- **`db/index.ts:165` — `analytics_events` table created but no route writes to it.** Dead schema or unwired feature.
- **`socket/handlers.ts:33` — Redis `setEx('socket:'+userId, 3600, id)` overwrites prior socket id on multi-device** without tracking multi-session. `io.to('user:'+userId)` works because of the room join, but the socket-id mapping is only useful for direct emits; keep it as a set, not a string.
- **No graceful shutdown.** `httpServer.listen` never registers SIGTERM/SIGINT to drain sockets, close Redis, end the PG pool. Containers will hang on `docker stop`.
- **No structured request IDs.** Winston request log doesn't include a correlation id.
- **`models/chat.ts:46` — `markMessagesAsRead(matchId, 'company')`** always marks "company" senders as read regardless of who's reading. Fine while the platform is candidate-only, but will break when the recruiter side ships.
- **`services/ai.ts:91` — final-score normalization clamps to `score / (factors * 0.25)`.** If `factors` is e.g. 3, the divisor is 0.75 and a perfect-match score can exceed 1.0 pre-clamp. Just `Math.min(score, 1)` would be cleaner.

### 🟢 Low / Polish

- 52 lint warnings, mostly `'error' is defined but never used` in catch blocks → either `catch { logger.error(...) }` or use the `_error` convention.
- `services/ai.ts:155-167` — "AI" outreach is a templated string randomly picked from 3 templates. Either ship OpenAI integration (dep is already imported but unused) or rename to "template message".
- `routes/payments.ts` is **mock** ("returns hard-coded `https://stripe.com/checkout/mock`") and `routes/stripe.ts` is **real** — both are mounted (`/api/payments`, `/api/stripe`). Confusing dual surface. Pick one.
- `routes/location.ts:46-65` — geocoder hardcodes 10 city centroids. Cities not in the list silently return null. Use a real geocoder (Mapbox/Google) or document this.
- `BUILD_COMPLETE.md` lists "Real-time WebSocket chat" and "Recruiter dashboard" as ✅ but neither has a real recruiter session (recruiter chat broadcasts to `match:<id>` rooms but no recruiter ever joins them; the room is candidate-only).
- `SETUP_GUIDE.md:74-83` instructs `POST /api/setup/setup-admin` with no `X-Setup-Token` header — instructions are stale vs. the hardening that landed in `routes/setup.ts`. Already corrected in `README.md`/`TESTING.md`/`deploy.sh`; just delete or update SETUP_GUIDE.md.
- `server/.env` is present locally but properly gitignored; only `.env.example` is tracked. ✅

---

## Findings — Client (`client/src/`)

### 🔴 Critical

- (none specific to client; the prod-blocking issues are server-side.)

### 🟠 High

- **`lib/socket.ts:13` — hard-coded `io('/')`.** Ignores `VITE_SOCKET_URL` (which is even in `.env.example`). When the client is served from a different origin than the API (the documented Railway pattern), sockets simply won't connect. Use `import.meta.env.VITE_SOCKET_URL || '/'`.
- **`lib/api.ts:21-30` + `store/auth.ts` — JWTs persisted in `localStorage`.** Anything-XSS = full account takeover. Move to httpOnly Secure cookies (`/auth/login` sets cookie, refresh interceptor goes away). Defer if a strict CSP is in place — but there is no CSP in `client/nginx.conf`.
- **`pages/Profile.tsx` and `App.tsx` — no error boundary.** A single render error in the 877-line Profile blanks the whole app.
- **Recruiter routes accessible to candidates.** `App.tsx:127-148` gates `/recruiter/*` on `isAuthenticated` only; there is no `user?.role === 'recruiter'` check. A candidate hitting `/recruiter/dashboard` will get an empty list (because of server-side `created_by = req.userId`) but should be redirected.

### 🟡 Medium

- **`App.tsx:31-34` — `useEffect` deps lint warning is suppressed by passing `[]`.** Stale auth check on refresh is benign here but the warning lists 30 such warnings across the app.
- **`pages/Swipe.tsx:46-48` — `useEffect(..., [filters])` re-fetches jobs on every filter object identity change**, and the filter object is recreated every render from `useState` so changes work, but adding a deps lint fix should preserve correctness.
- **Bundle: 882 KB JS, 258 KB gzip, in one chunk.** No `manualChunks`, no `React.lazy`. First paint on mobile 3G will be slow. recharts + framer-motion + lucide are heavy.
- **No code splitting per route.** Easy win: `const Profile = lazy(() => import('./pages/Profile'))`.
- **PWA configured (`vite.config.ts:10`)** but `manifest.json` icons reference `/icon-192.png` and `/icon-512.png` — verify those exist in `client/public/` (not visible in the tree; would 404).
- **`lib/api.ts:55-62` — refresh-failure redirect uses `window.location.href = '/login'`** which is fine but loses the in-app router state. Use a global event + react-router navigation.
- **No retry/backoff** on transient 5xx. axios interceptor only handles 401.
- **No offline handling / no service-worker custom routes** beyond default precaching.
- **No `Sentry`/error tracking client-side**; same on server.
- **`pages/Profile.tsx` is 877 lines and `pages/recruiter/Dashboard.tsx` 478 lines** — needs decomposition; lots of inline modals and forms.
- **`pages/ApiTester.tsx` ships in the production bundle.** Even gated by login, it exposes endpoint catalog. Consider tree-shaking it out of prod builds (Vite `define`/`import.meta.env.DEV`).

### 🟢 Low / Polish

- 30 lint warnings (all unused `err` and 2 react-hooks deps).
- No dark mode toggle despite Tailwind.
- No i18n / locale handling.
- No accessibility audit: swipe buttons in `Swipe.tsx:188-208` are buttons (good) but icon-only with no `aria-label`. JobCard, FilterPanel similar.
- No SEO meta tags / OpenGraph in `index.html` beyond title.
- No `robots.txt` / `sitemap.xml` in `client/public/`.

---

## Findings — Mobile (`mobile/`)

### 🔴 Critical

- **App will not start.** `mobile/App.tsx:8` imports `./src/screens/SignupScreen` and `src/navigation/MainTabs.tsx:4-6` imports `MatchesScreen`, `ProfileScreen`, `AnalyticsScreen`. Only `LoginScreen.tsx` and `SwipeScreen.tsx` exist. README labels this "unfinished prototype" — fair, but BUILD_COMPLETE.md still ticks them as ✅.

### 🟠 High

- **`mobile/src/lib/api.ts:5` — `API_URL = 'http://localhost:3001/api'` hard-coded.** Will never work on a device. Use `expo-constants` or `EXPO_PUBLIC_API_URL`.
- **`mobile/src/lib/api.ts:14` — interceptor reads `AsyncStorage.getItem('token')`** but the Zustand `persist` middleware stores under the key `'swipehire-auth'`. The token is set under both `'token'` (manual in LoginScreen) and the persist store, but the two are not kept in sync. Refactor to a single source of truth.
- **No refresh-token support on mobile** (only stores `accessToken`; clears auth on 401). 15-minute sessions on mobile are awful UX.

### 🟡 Medium

- No deep linking config.
- No push notifications (Expo Notifications not wired).
- `SwipeScreen.tsx:24` uses `new Animated.ValueXY()` in render — should be `useRef`.

### 🟢 Low

- Mobile section in `BUILD_COMPLETE.md` is aspirational, not factual.

---

## Findings — E2E (`e2e/`)

### 🟡 Medium

- **`e2e/tests/swipehire.spec.ts:36-39`** asserts `text=Invalid credentials` is visible, but the toast lib used (`react-hot-toast`) renders ephemeral toasts; if the test runs slower than the toast lifetime (default ~4s), this is flaky. Use `toBeVisible({timeout: 2000})`.
- **Tests assume `admin@swipehire.com / admin123`** seeded — only happens automatically in non-prod. The README documents this; OK but fragile.
- **Tests assume jobs exist** but don't seed them; depends on `seed-sample-companies` having been hit. Add a `globalSetup` to seed.
- **Selectors mix text and data-testid** (`text=No more jobs` vs `[data-testid="job-card"]`). Standardize on `data-testid`s; many of the asserted ones (`job-card`, `swipe-right`, `match-item`, `message-input`, `send-message`) are not actually in the source. They will fail.

### 🟢 Low

- 5 projects (chromium/firefox/webkit/mobile chrome/mobile safari) — fine for CI but slow.
- No CI workflow (`.github/workflows/` does not exist) — Playwright is configured but never automatically run.

---

## Findings — DevOps / Deploy

### 🟠 High

- **No CI/CD.** No `.github/workflows/` directory. Lint/build/test/audit only run if someone remembers locally.
- **`docker-compose.dev.yml:46-50` — committed dummy Stripe keys** (`sk_test_dummy`, `price_pro_dummy`) and weak JWT secrets. Fine for dev only but make sure no environment ever copies that file as `docker-compose.yml`. The split into prod (`docker-compose.yml`) requiring `:?` is correct.
- **`server/Dockerfile` is good** (multi-stage, non-root `app` user, healthcheck, prune dev deps) — ✅ best-practice. Minor nit: no `.dockerignore` was visible at `server/.dockerignore` — verify it exists (else `node_modules`, `logs/`, `.env` may leak into the build context).
- **`client/Dockerfile` ships nginx but no `.dockerignore` either** and embeds the entire client source into the build stage. Fine, but slow.

### 🟡 Medium

- **No `HEALTHCHECK` in `client/Dockerfile`.**
- **`railway.json` builds only server; client deployment path unclear.** The doc says "point the frontend at the deployed API via `VITE_API_URL`" — but the live URL `https://swipehire-production-c0a5.up.railway.app/swipe` serves the SPA. Either there are two Railway services (likely) or the server has a static fallback that's not in the source tree. Document this.
- **`nginx.conf` has no CSP/HSTS/X-Frame-Options/X-Content-Type-Options headers.** Helmet handles them on the API side; the SPA gets none.
- **`deploy.sh:23-32` writes `.env` with `CLIENT_URL=http://localhost:3000`** then warns "edit for production". Reasonable, but `deploy.sh` won't be idempotent: re-running it (with an existing `.env`) is fine, but `SETUP_TOKEN` will be different from any prior install if the file existed via a different mechanism.
- **`deploy.sh:9-12` Docker check** is good. ✅
- **Logs go to `/app/logs/{error,combined}.log` files** in container — works, but redundant with `Console` transport. Set `Console` only and let docker logs / Railway collect.

### 🟢 Low

- `package.json` (root) has only `build`/`start` and just chains into `server/`. Add `lint`, `test`, `audit` aggregator scripts.
- `test-db.js` at repo root looks orphaned. (Need to confirm.)

---

## Findings — Docs

- **`SETUP_GUIDE.md`** is stale (no `X-Setup-Token` instructions, uses `docker-compose` v1 syntax in option A — already partially modernized but inconsistent).
- **`BUILD_COMPLETE.md`** overclaims completion (mobile, recruiter chat, AI scoring). Either delete it (it's a checklist artifact) or mark items as 🚧.
- **`README.md`** is solid and accurate for the current state. ✅
- **`TESTING.md`** is solid; "Messages duplicating" troubleshooting hint is great. ✅
- **No `CONTRIBUTING.md`, `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.**

---

## Top 10 prioritized recommendations

1. **Fix Stripe webhook ordering AND add unique constraint** on `subscriptions.stripe_subscription_id` (`db/index.ts` + reorder middleware in `index.ts`). Without this, payments are broken.
2. **Replace `Math.random()` matching** with a real mutual-swipe check (`models/swipe.ts:53`) — a `recruiter_swipes` table or a `direction` field on a unified `swipes` table.
3. **Lock down `/api/startups/seed`** behind `requireSetupToken` (or delete it; `/api/setup/seed-sample-companies` already covers this).
4. **Fix the broken unmatch notification** (`routes/matches.ts:113`) and the IDOR on notifications mark-as-read (`routes/notifications.ts:43`).
5. **Add `requireRecruiter` middleware** to all `/api/recruiter/*` routes; gate client `/recruiter/*` routes by `user.role`.
6. **Run `npm audit fix` in both server/ and client/** — `axios` and AWS SDK transitive CVEs.
7. **Refactor token storage** — move JWTs to httpOnly Secure cookies; enforce refresh-token rotation against Redis on `/auth/refresh`; validate `decoded.type` in `verifyAccessToken/verifyRefreshToken`.
8. **Wire socket URL via `VITE_SOCKET_URL`** (`client/src/lib/socket.ts`); add error boundaries; lazy-load routes; add `manualChunks`.
9. **Remove `/api/payments` mock router**; consolidate on `/api/stripe`. Delete `mobile/src/navigation/MainTabs.tsx` imports of missing screens, OR ship `SignupScreen/MatchesScreen/ProfileScreen/AnalyticsScreen`.
10. **Stand up CI**: `.github/workflows/ci.yml` with matrix (server lint+test+audit, client lint+typecheck+build, e2e on PR). Fail the build on new lint errors and high CVEs.

---

## Suggested next sprint (concrete actionable items)

1. **Schema/migration system**: introduce `node-pg-migrate`, port `initDB` into `migrations/000_init.sql`, add `migrations/001_subscription_unique.sql` (`ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_stripe_sub_id_uniq UNIQUE (stripe_subscription_id)`), `002_add_website_url.sql`, `003_add_recruiter_swipes.sql`.
2. **Auth hardening**: extract `middleware/auth.ts` + `middleware/requireRole.ts`; add token-type checks; rotate refresh tokens against Redis; add `POST /auth/forgot-password` + `POST /auth/reset-password/:token` (using `verification_codes` table which already exists).
3. **Stripe correctness**: move raw-body parser above json; add unique index; idempotent webhook handling (track `event.id`); add `customer.subscription.updated` handler (currently only `deleted`).
4. **Matching MVP**: add `recruiter_swipes(recruiter_id, candidate_id, job_id, direction)` and update `checkForMatch` to query it for a true mutual right-swipe.
5. **Observability**: add request IDs, swap Winston console-only, wire Sentry on server+client, add `/metrics` (prom-client) gated by admin role.
6. **Frontend perf**: route-level `React.lazy`, `manualChunks` (`react`, `recharts`, `framer-motion`), drop `recharts` for `react-sparklines` on small charts if possible. Target < 200 KB gz first chunk.
7. **A11y pass**: add `aria-label` to all icon buttons; verify focus order; lighthouse > 90 a11y.
8. **CI**: GitHub Actions running `npm ci && npm run lint && npm run build && npm test` per package + `npm audit --omit=dev --audit-level=high`.
9. **Mobile**: either ship the 4 missing screens or remove the `mobile/` tree from the repo (and update README/BUILD_COMPLETE.md). Current state confuses contributors.
10. **Docs**: delete or update `SETUP_GUIDE.md` and `BUILD_COMPLETE.md`; add `SECURITY.md` (how to report) + `LICENSE`.

---

## File coverage notes

Every file under `server/src/`, `client/src/`, `mobile/`, `e2e/` was opened and read. Files not explicitly cited above were reviewed and had no notable issues beyond the cross-cutting lint warnings:

- ✅ `server/src/__tests__/smoke.test.ts` — minimal but sensible smoke suite
- ✅ `server/src/db/init.ts` — trivial CLI wrapper around `initDB`
- ✅ `server/src/types/express.d.ts` — minimal `userId` ambient type
- ✅ `server/src/routes/{analytics,chat,profile}.ts` — straightforward, no concerns beyond duplicated `authenticate`
- ✅ `server/src/models/{chat,notification}.ts` — small, correct
- ✅ `server/src/models/startup.ts` — large because of `seedStartupsAndJobs` fixtures; logic OK
- ✅ `client/src/components/{JobCard,FilterPanel,MatchModal,Layout,RecruiterLayout}.tsx` — fine; minor lint nits only
- ✅ `client/src/pages/{Login,Signup,Onboarding,Matches,Messages,Notifications,Work,Analytics,Subscription,ApiTester,recruiter/*}.tsx` — reviewed; concerns rolled up under Client findings
- ✅ `client/src/theme.ts`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js` — fine
- ✅ `mobile/App.tsx`, `mobile/src/screens/{Login,Swipe}Screen.tsx` — reviewed; concerns under Mobile
- ✅ `e2e/playwright.config.ts`, `e2e/tests/swipehire.spec.ts` — reviewed; concerns under E2E
- ✅ `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf`, `railway.json`, `docker-compose*.yml`, `deploy.sh`, `.gitignore`, `.env.example` files — reviewed; concerns under DevOps
