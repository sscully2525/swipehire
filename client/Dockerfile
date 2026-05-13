# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Default API target — override at runtime with -e API_PROXY_TARGET=...
ENV API_PROXY_TARGET=http://server:3001

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Template config -> nginx envsubst expands $API_PROXY_TARGET on container start.
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 3000

# nginx:alpine includes an entrypoint that runs envsubst on
# /etc/nginx/templates/*.template and writes to /etc/nginx/conf.d/.
