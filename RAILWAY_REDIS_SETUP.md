# Railway Redis Setup

Production currently reports `redis: "disconnected"` because the server
container has no working `REDIS_URL`. Redis is **required** for:

- Refresh-token rotation (auth fails closed in prod without it).
- Per-route rate limiting (falls back to in-memory; correctness still ok,
  but limits aren't shared across replicas).
- User-info / job-list caching.

## Fix in Railway (one-time)

1. **Add the Redis plugin** to the Gigly project:
   - Railway dashboard → Gigly project → **+ New** → **Database** →
     **Add Redis**.
2. **Reference it from the server service.**
   - Open the server service → **Variables** tab → **+ New Variable**.
   - Name: `REDIS_URL`
   - Value: `${{Redis.REDIS_URL}}`   ← reference, not a literal.
   - Save. Railway will redeploy.
3. **(Optional) raw URL.** If for some reason the reference syntax
   doesn't resolve, grab the URL from the Redis service's *Connect* tab
   and paste it as a plain value. Use the **public** URL only as a
   last resort; the private URL is preferred and free.
4. **Redeploy if needed** — most variable changes auto-redeploy.

## Verify

After the redeploy:

```bash
# Liveness — should always be 200
curl -sS https://swipehire-production-c0a5.up.railway.app/api/health | jq .

# Readiness — 200 only if redis + db are both up
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://swipehire-production-c0a5.up.railway.app/api/health/ready
```

Expected `/api/health` body:

```json
{
  "status": "ok",
  "version": "2.1.0",
  "uptimeSeconds": 42,
  "redis": { "status": "connected", "latencyMs": 1 },
  "db":    { "status": "connected", "latencyMs": 3 }
}
```

If `redis.status` stays `"disconnected"` after the deploy, check the
server logs for the boot line:

```
{"msg":"Initializing Redis","url":"redis://default:***@redis.railway.internal:6379"}
```

- If `url` is `(unset)`, the env var didn't propagate — re-check the
  variable name spelling (`REDIS_URL`).
- If `url` looks right but ready never fires, network policies might be
  blocking the private URL — switch to the public URL temporarily.

## Local dev

```bash
# In server/.env
REDIS_URL=redis://localhost:6379
```

Or run a local Redis container:

```bash
docker run --rm -p 6379:6379 redis:7-alpine
```

In dev, if Redis is down the server logs a warning and degrades
gracefully — auth refresh proceeds without the rotation check, and rate
limiters fall back to in-memory. Production has no such fallback; failures
are surfaced via `/api/health/ready`.
