# Fixes Applied V3

Continuation improvement pass after V2. Focus stayed on app quality and production hardening: no feature deletion to silence warnings.

## Commits

| Commit | Area | Enhancement |
|---|---|---|
| `95485968` | Payments + logging | Moved the web subscription page to the canonical Stripe subscription API, kept `/api/payments/subscribe` as a compatibility endpoint with explicit deprecation/successor headers, and converted another batch of legacy server `console.*` calls to structured pino logger calls with user/request context. |
| `cf86efcd` | E2E hardening | Added stable `data-testid` hooks for swipe cards/buttons, added form `name` attributes used by automation, and replaced stale brittle Playwright tests with candidate signup, route-guard, swipe, and key-page smoke coverage. |

## Verification

Run after V3 changes:

- `cd server && npm run lint && npm run build`
- `cd client && npm run lint && npm run build`

Full final verification and prod check were run before push from this pass.

## Remaining recommended improvements

1. Finish decomposing `client/src/pages/Profile.tsx` into section components with visual QA. It is large but functionally stable; refactor should be done deliberately.
2. Consolidate `/api/payments/*` and `/api/stripe/*` more deeply by extracting shared subscription/plan logic into a service module. V3 removed client dependency on the legacy path and made the compatibility route explicit.
3. Replace the remaining legacy `console.*` calls in older route files (`profile-enhanced`, `stripe`, `verification`, etc.) with structured logger calls.
4. Make Playwright e2e required in CI once seeded fixtures are reliable in GitHub Actions.
