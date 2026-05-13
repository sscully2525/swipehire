# Fixes Applied V6 — Swipe Feed Cache Invalidation

## Root cause
- The candidate job feed cache key was versioned as `jobs:v3:<userId>:...`.
- Swipe cache invalidation still only scanned the legacy pattern `jobs:<userId>:*`.
- Result: the swipe was saved correctly, but browser refresh could reuse a stale cached feed and show the same already-swiped job again.

## Fix
- Updated swipe cache invalidation to clear both:
  - `jobs:<userId>:*`
  - `jobs:v*:<userId>:*`
- Added a regression test to ensure future cache-key version changes do not break invalidation again.

## Verification
- Server lint ✅
- Server build ✅
- Server tests 18/18 ✅
