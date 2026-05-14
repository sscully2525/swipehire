# Fixes Applied V7 — Messages Inbox

## Root cause
- Candidate match-detail chat used `/api/chat/:matchId/messages`, which worked.
- The top-level Messages tab loaded `/api/matches` and filtered to rows with `last_message`.
- `/api/matches` did not include `last_message`, so the Messages tab filtered every match out and showed an empty inbox.

## Fix
- Enriched `getUserMatches()` with:
  - `last_message` JSON from the latest `chat_messages` row
  - integer `unread_count`
  - ordering by latest message timestamp first, falling back to match creation time

## Verification
- Server lint ✅
- Server build ✅
- Server tests 18/18 ✅
