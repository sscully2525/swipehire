# Gigly Pivot Roadmap

SwipeHire → **Gigly**: from a job-matching app to a freelance gig marketplace.
Freelancers **swipe to discover** gigs and **bid to commit**; clients post gigs
with a price point and pick a bid. Payments are handled **off-platform for now**.

## Conceptual mapping

| Old (SwipeHire) | New (Gigly) |
|-----------------|-------------|
| Job (posted by a startup) | **Gig** — title, scope, price point, deadline |
| Startup / recruiter | **Client** (anyone can post a gig) |
| Candidate | **Freelancer** |
| Mutual swipe → match | Freelancer swipes → bids → client accepts |
| Subscription tiers (swipe limits) | Kept as-is for now (repurpose later) |

## Done in this pass

- **Rebrand to Gigly**: all display strings (`SwipeHire` → `Gigly`), package
  names (`swipehire-*` → `gigly-*`), PWA manifest, logger service name, and the
  client/mobile auth storage key (`swipehire-auth` → `gigly-auth`).
  > Note: changing the storage key logs out any existing sessions — fine
  > pre-launch.
- **Gig pricing + bids data model** (`server/migrations/016_gigly_gigs_and_bids.sql`):
  added `pricing_type`, `budget_min/max`, `budget_currency`, `deadline`,
  `estimated_duration` to the `jobs` table, and a new `bids` table.
- **Bid API**: `server/src/models/bid.ts` + `server/src/routes/bids.ts`, mounted
  at `/api/bids`:
  - `POST /api/bids` — place/update a bid (freelancer)
  - `GET /api/bids/mine` — my bids (freelancer)
  - `GET /api/bids/gig/:jobId` — bids on a gig (gig owner only)
  - `PATCH /api/bids/:id/status` — accept/decline (gig owner)
  - `DELETE /api/bids/:id` — withdraw (freelancer)

## Done in pass 2 (bid UI + remaining bug fixes)

- **Bid UI shipped**: `BidModal` (place a bid from the swipe deck), "My Bids"
  page at `/bids` (list + withdraw, in candidate nav), and an expandable
  per-gig bids panel with Accept/Decline in the recruiter/client dashboard.
- Swipe card now shows gig budget (`fixed`/`hourly`) and deadline when the
  post is a priced gig; falls back to salary/equity for legacy job posts.
- Header logos in both layouts now read "Gigly"; recruiter layout badge says
  "Client"; candidate nav says "Gigs"; e2e assertion updated.
- All 5 outstanding audit bugs fixed (see below).

## Done in pass 3 (gig posting + deal flow complete)

- **Gig post form**: `JobForm` is gig-first — pricing selector (fixed / hourly /
  salaried role), budget low/high, deadline, estimated time. `POST
  /api/recruiter/jobs` validates and persists the new fields (a priced gig
  requires a budget; budget min ≤ max).
- **Accepted bid opens chat**: `PATCH /api/bids/:id/status` with `accepted`
  now creates a match (idempotent) and notifies the freelancer
  (`bid_accepted`); declines send `bid_declined`.
- **Label renames finished**: Client Dashboard (tabs My Gigs / Freelancers /
  Analytics, "Post a Gig", budget shown on gig rows), Work page (Find Gigs /
  Matched Gigs), recruiter nav "Freelancers", Candidates page copy.
- **CLAUDE.md rewritten** for Gigly: new project overview, domain-naming map
  (jobs=gigs, startups=clients, candidates=freelancers), and two stale claims
  fixed (auth middleware is shared now; schema lives in `server/migrations/`,
  not inline).

## Remaining work

- **AI scoring** (`server/src/services/ai.ts`) still weights salary/equity/stage —
  re-weight for gigs (budget fit, skill match, availability).
- Routes `/recruiter/*` → `/client/*` rename (cosmetic; keep redirects).
- Internal naming (`jobs` table, `startups`, `recruiter` routes) still legacy —
  documented in CLAUDE.md; rename only if it starts hurting.

### 3. Deferred branding (interconnected — change together)
These were left in place to avoid breaking the dev-login flow and local DB volume:
- DB name `swipehire` (`docker-compose*.yml`, `server/src/db/index.ts` default) —
  renaming requires recreating the local Postgres volume (`make nuke-and-seed`).
- Dev/admin seed emails `admin@swipehire.com`, `sean@swipehire.com`
  (`server/src/index.ts`, `routes/setup.ts`, `client/src/pages/Dev.tsx`,
  `components/DevPanel.tsx`) and the seed slug `swipehire-labs`. Update the seed
  data, the dev-login panel, and the `admin@…` reference in `CLAUDE.md` in one go.
- Update `CLAUDE.md` project description from "Tinder-style job-matching" to the
  Gigly framing.

### 4. Payments (later, when ready)
Off-platform for now. When monetizing per-gig, add Stripe Connect: client funds
the accepted bid into escrow, released to the freelancer on completion, plus
a ratings/reviews loop.

## Audit bugs — all fixed ✅
Pass 1: swipe-limit bypass (`||` vs `??`), socket `send_message`/`load_messages`
missing ownership checks.
Pass 2:
- OAuth tokens no longer in redirect URL — one-time Redis code +
  `POST /api/auth/oauth/exchange` (client `AuthCallback` updated).
- `createSystemMessage` inserts `NULL` sender_id instead of the string `'system'`.
- Swipe limit enforced atomically (`createSwipeWithLimit`, per-user
  `pg_advisory_xact_lock` inside a transaction).
- Stripe webhook `planId` whitelisted against `PLANS` in both
  `checkout.session.completed` and `customer.subscription.updated`.
- OAuth placeholder password now from `crypto.randomBytes(32)`.
