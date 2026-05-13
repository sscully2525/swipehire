# SwipeHire

A Tinder-style job-matching platform. Candidates swipe jobs, recruiters swipe candidates, mutual matches unlock chat.

- **server/** — Node.js + Express + TypeScript API (Postgres, Redis, Socket.IO, Stripe)
- **client/** — React + Vite + TypeScript + Tailwind web app
- **mobile/** — React Native + Expo app (unfinished prototype; not part of the prod build)
- **e2e/** — Playwright tests

## Quick start (Docker, recommended)

Requires Docker 20.10+ with the v2 `docker compose` plugin.

```bash
# One-shot: generates a .env with strong secrets, builds, and starts everything.
./deploy.sh

# Bring up the stack only, with your own .env:
cp server/.env.example .env             # then edit secrets to taste
docker compose up -d --build

# Health check
curl http://localhost:3001/api/health
open http://localhost:3000
```

`deploy.sh --admin` also prompts to create an initial admin user via the
gated `/api/setup` endpoints (uses the generated `SETUP_TOKEN`).

### Required env vars (production compose)

| Var | Notes |
|---|---|
| `DB_PASSWORD` | Postgres password |
| `JWT_SECRET` | >= 32 chars, random |
| `JWT_REFRESH_SECRET` | >= 32 chars, random, different from JWT_SECRET |
| `CLIENT_URL` | Browser-facing origin used for CORS (comma-separate for multiple) |
| `SETUP_TOKEN` | Required to call any `/api/setup/*` endpoint in prod |

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`,
`STRIPE_UNLIMITED_PRICE_ID`, `SEED_DEFAULT_ADMIN`, `DEFAULT_ADMIN_PASSWORD`.

The server **refuses to start** in production if `JWT_SECRET`,
`JWT_REFRESH_SECRET`, or `CLIENT_URL` are missing or look like placeholders.

## Local development (without Docker)

```bash
# Backend
cd server
cp .env.example .env       # edit if needed
npm install
npm run db:init            # requires local Postgres + Redis
npm run dev                # http://localhost:3001

# Frontend (in another terminal)
cd client
npm install
npm run dev                # http://localhost:3000, proxies /api to :3001
```

Or use the dev compose:

```bash
docker compose -f docker-compose.dev.yml up
```

## Scripts

### Server (`cd server`)
- `npm run dev` — hot-reload dev server
- `npm run build` — TypeScript → `dist/`
- `npm start` — run built server
- `npm test` — Jest smoke tests
- `npm run lint` — ESLint
- `npm run db:init` — create schema

### Client (`cd client`)
- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production bundle
- `npm run preview` — serve the production bundle
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint (warnings allowed)
- `npm run lint:strict` — fails on any warning

## End-to-end tests

```bash
cd e2e
npm install
npx playwright install --with-deps
# In another terminal, start the stack:
#   docker compose -f docker-compose.dev.yml up
PLAYWRIGHT_AUTO_START=1 npm test   # or just `npm test` if stack is already up
```

The login test in `swipehire.spec.ts` expects an `admin@swipehire.com /
admin123` user. The server seeds this automatically in non-production mode
(or when `SEED_DEFAULT_ADMIN=true`).

## Deployment

- **Docker compose** (this repo's `docker-compose.yml`) for self-hosting.
- **Railway** uses `railway.json` (server only — point the frontend at the
  deployed API via `VITE_API_URL` when building the client).

## Security notes

- All passwords are bcrypt(12).
- JWT access tokens expire in 15m, refresh tokens in 7d (stored in Redis).
- `/api/setup/*` endpoints require `X-Setup-Token: $SETUP_TOKEN`; in
  production they return 503 if `SETUP_TOKEN` is unset.
- `/api/admin/*` endpoints require role=`admin` on the JWT subject.
- Stripe webhook signatures are verified in production.
- CORS allowlist is built from `CLIENT_URL` (comma-separated supported).

## Repository layout

```
swipehire/
├─ server/             # Express API + Postgres + Redis
├─ client/             # React web app
├─ mobile/             # Expo prototype (not built)
├─ e2e/                # Playwright tests
├─ docker-compose.yml  # Production stack
├─ docker-compose.dev.yml
├─ deploy.sh           # Convenience script with secret generation
└─ railway.json        # Railway PaaS config (server)
```

See `TESTING.md` for the test matrix and `BUILD_COMPLETE.md` for an
inventory of features.
