# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Build-only native deps
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Drop dev deps to reduce size of node_modules that we copy below.
RUN npm prune --omit=dev


# --- Runtime stage ---
FROM node:20-alpine AS runtime

WORKDIR /app

# wget is used by the healthcheck below.
RUN apk add --no-cache wget && \
    addgroup -S app && adduser -S app -G app

# Copy build output + pruned production node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/migrations ./migrations
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package*.json ./

# Logs directory writable by the app user
RUN mkdir -p /app/logs && chown -R app:app /app/logs

USER app

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "dist/index.js"]
