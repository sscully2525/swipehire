#!/usr/bin/env bash
# SwipeHire Deployment Script
# Brings up the production docker-compose stack with strong secrets and creates
# an initial admin user via the gated /api/setup endpoints.

set -euo pipefail

cd "$(dirname "$0")"

echo "🚀 SwipeHire Deployment Script"
echo "================================"

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running."
    exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
    echo "❌ 'docker compose' (v2) is required."
    exit 1
fi

# Generate a .env if missing
if [ ! -f ".env" ]; then
    echo "📝 Creating .env with generated secrets..."
    cat > .env <<EOF
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CLIENT_URL=http://localhost:3000
SETUP_TOKEN=$(openssl rand -hex 24)
SEED_DEFAULT_ADMIN=false
EOF
    chmod 600 .env
    echo "✅ Wrote .env (mode 600). Review it and edit CLIENT_URL for production."
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "🐳 Building and starting services..."
docker compose up -d --build

echo "⏳ Waiting for backend health..."
for i in $(seq 1 30); do
    if curl -fsS http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend healthy"
        break
    fi
    sleep 2
    if [ "$i" -eq 30 ]; then
        echo "❌ Backend never reported healthy. Check 'docker compose logs server'."
        exit 1
    fi
done

# Optional admin bootstrap
if [ "${1:-}" = "--admin" ]; then
    echo ""
    read -rp "Admin email: " ADMIN_EMAIL
    read -rsp "Admin password: " ADMIN_PASSWORD; echo
    read -rp "First name: " ADMIN_FIRSTNAME
    read -rp "Last name: " ADMIN_LASTNAME

    curl -fsS -X POST http://localhost:3001/api/setup/setup-admin \
        -H "Content-Type: application/json" \
        -H "X-Setup-Token: ${SETUP_TOKEN}" \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"firstName\":\"${ADMIN_FIRSTNAME}\",\"lastName\":\"${ADMIN_LASTNAME}\"}" \
        > /dev/null
    echo "✅ Admin user created."

    curl -fsS -X POST http://localhost:3001/api/setup/seed-admin-company \
        -H "Content-Type: application/json" \
        -H "X-Setup-Token: ${SETUP_TOKEN}" \
        -d "{\"adminEmail\":\"${ADMIN_EMAIL}\"}" > /dev/null
    echo "✅ Seeded admin demo company."
fi

echo ""
echo "🌐 URLs:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Health:      http://localhost:3001/api/health"
echo ""
echo "🛑 Stop:    docker compose down"
echo "🔄 Restart: docker compose restart"
