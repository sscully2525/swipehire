# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwipeHire is a Tinder-style job-matching platform. Candidates swipe on startup jobs; recruiters review interested candidates. Both sides must express interest for a match to form. Matches unlock real-time chat.

Three sub-projects live in this monorepo:
- `server/` — Node.js/Express/TypeScript REST API + Socket.io (port 3001)
- `client/` — React/TypeScript/Tailwind SPA with Vite (port 3000)
- `mobile/` — React Native/Expo app (early-stage)
- `e2e/` — Playwright end-to-end tests

## Commands

### Server

```bash
cd server
npm run dev          # ts-node-dev with hot reload
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm run db:init      # run db/init.ts manually (server auto-inits on startup)
npm run lint         # eslint src --ext .ts
npm test             # jest
```

### Client

```bash
cd client
npm run dev          # Vite dev server (proxies /api and /socket.io to port 3001)
npm run build        # tsc + vite build → dist/
npm run lint         # eslint with max-warnings 0
```

### Full stack (Docker)

```bash
# Development (hot reload, source-mapped)
docker-compose -f docker-compose.dev.yml up

# Production build
docker-compose up -d

# Connect to Postgres
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d swipehire

# Connect to Redis CLI
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

### End-to-end tests (Playwright)

```bash
cd e2e
npm install && npx playwright install
npx playwright test                          # all browsers
npx playwright test swipehire.spec.ts        # single file
npx playwright test --project=chromium       # single browser
npx playwright test --ui                     # interactive UI mode
npx playwright show-report
```

### Seed / admin setup

```bash
# Seed sample companies (idempotent)
curl http://localhost:3001/api/setup/seed-sample-companies

# Default local admin
email: admin@swipehire.com  password: admin123
```

## Architecture

### Server

**Entry point** `server/src/index.ts` wires together all middleware, mounts routes, starts Socket.io, and auto-calls `initDB()` + creates a default admin on first boot. The `logger` (winston) and `redis` client are exported from this file and imported across the codebase — don't create new instances elsewhere.

**Database** (`server/src/db/index.ts`) exports `query(sql, params)` and `getClient()` from a pg `Pool`. `initDB()` is idempotent (`CREATE TABLE IF NOT EXISTS`). Schema is defined inline here — there is no migration framework; schema changes go into `initDB()` or `db/migrate.ts`.

**Models** (`server/src/models/`) are thin data-access modules:
- `user.ts` — user CRUD, bcrypt password hashing, JWT generation/verification (`verifyAccessToken`, `verifyRefreshToken`), Redis refresh-token store, swipe-limit lookup by tier
- `swipe.ts` — swipe creation, match detection, match creation
- `chat.ts` / `notification.ts` — messaging and notification persistence

**Routes** each define their own inline `authenticate` middleware (duplicated across files) that calls `verifyAccessToken` and attaches `req.userId`. The global `Request` type is augmented in `server/src/types/express.d.ts`.

**AI service** (`server/src/services/ai.ts`) computes match scores with a weighted TF-IDF-style algorithm (skills 40%, experience 20%, salary 20%, remote 10%, stage 10%). Results are cached in Redis for 10 minutes under `recommendations:{userId}`.

**Socket.io** (`server/src/socket/handlers.ts`) authenticates via JWT on the handshake, stores `socket:{userId}` → socket ID in Redis (TTL 1 h), and manages rooms `user:{userId}` (notifications) and `match:{matchId}` (chat).

**Rate limiting**: global 100 req / 15 min; auth endpoints 10 req / hour.

**Stripe webhook** (`/api/stripe/webhook`) requires raw body — `express.raw` is applied before `express.json`.

### Client

**API client** (`client/src/lib/api.ts`) is an axios instance with `baseURL: '/api'`. The Vite dev proxy forwards `/api` and `/socket.io` to `localhost:3001`, so the client never hardcodes the server port.

**Auth interceptor** attaches `Authorization: Bearer <token>` from Zustand store on every request, and handles 401 responses by calling `/api/auth/refresh` once before redirecting to `/login`.

**State** (`client/src/store/auth.ts`) uses Zustand with `persist` middleware (key `swipehire-auth`) for auth/user data, plus two non-persisted stores for notification count and swipe count.

**Routing** (`client/src/App.tsx`): two layout shells — `<Layout>` for candidate routes and `<RecruiterLayout>` for recruiter routes. Onboarding gate: candidates must complete onboarding before reaching `/swipe`.

**Socket** (`client/src/lib/socket.ts`): `useSocket()` hook connects to `'/'` (same origin, proxied) with `transports: ['websocket']` and wires global notification events.

### Subscription tiers & swipe limits

| Tier       | Daily swipes |
|------------|-------------|
| free       | 10          |
| pro        | 50          |
| unlimited  | 999 999     |

Limits enforced server-side in `server/src/models/user.ts:getSwipeLimit` and checked per-swipe in `routes/swipes.ts`.

### Redis key conventions

| Key pattern               | TTL    | Purpose                        |
|---------------------------|--------|--------------------------------|
| `user:{id}`               | 1 h    | Cached user object             |
| `refresh:{userId}`        | 7 days | Refresh token store            |
| `socket:{userId}`         | 1 h    | Socket ID mapping              |
| `recommendations:{userId}`| 10 min | AI recommendation cache        |

## Environment Variables

Minimum required in `server/.env` (see `server/.env.example`):

```
DB_HOST / DATABASE_URL
DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET
JWT_REFRESH_SECRET        # falls back to a hardcoded string if missing — always set in prod
PORT                      # defaults to 3001
REDIS_URL                 # defaults to redis://localhost:6379
```

Optional:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
STRIPE_UNLIMITED_PRICE_ID
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION / AWS_S3_BUCKET  # file uploads
OPENAI_API_KEY            # used in routes/ai.ts
CLIENT_URL                # CORS origin, defaults to http://localhost:3000
```

## Key Conventions

- **Authentication** is duplicated as a local `authenticate` middleware in each route file rather than shared. When adding new routes, copy the same pattern from an existing route.
- **Database queries** always use parameterised `query(sql, [params])` — never string interpolation.
- **Cache invalidation**: update functions in `models/user.ts` call `redis.del(`user:{id}`)` after writes. Follow the same pattern for any model that adds Redis caching.
- **Logging**: use the exported `logger` from `server/src/index.ts` (winston), not `console.log`, except in `db/index.ts` which predates the logger import.
- **TypeScript**: both `server/` and `client/` have their own `tsconfig.json`. The server compiles to `dist/` via `tsc`; the client builds via Vite.
- **No shared package**: server and client do not share a types package. Type definitions are duplicated across the boundary (e.g., the `User` shape in `models/user.ts` vs the interface in `store/auth.ts`).
