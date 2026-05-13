# Stage 1: Build React client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Build Express server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --include=dev
COPY server/ .
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY --from=server-builder /app/server/dist ./server/dist
COPY server/migrations ./server/migrations
COPY --from=client-builder /app/client/dist ./client/dist
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
