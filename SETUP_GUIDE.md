# SETUP_GUIDE.md

> This file is retained for historical / external-link compatibility only.
> The detailed, current setup instructions live in the README.

To set up a development or production environment, see:

- [`README.md`](./README.md) — quick start, environment variables, docker compose
- [`TESTING.md`](./TESTING.md) — how to run server tests, e2e, and CI locally

In short:

```bash
# Clone, install
git clone <repo> swipehire && cd swipehire

# Server (Node 20+, PostgreSQL 14+, Redis 7+)
cd server && cp .env.example .env   # fill in real secrets
npm ci
npm run migrate
npm run dev

# Client
cd ../client && cp .env.example .env  # set VITE_API_URL / VITE_SOCKET_URL
npm ci
npm run dev
```

Stripe webhooks must hit `/api/stripe/webhook` BEFORE `express.json` parses
the body — this is already wired in `server/src/index.ts`. Use the Stripe CLI
to forward events while developing.
