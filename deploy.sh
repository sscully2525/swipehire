#!/bin/bash

# SwipeHire Deployment Script
# This script sets up the admin account and deploys the application

echo "🚀 SwipeHire Deployment Script"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server/.env file..."
    cat > server/.env << EOF
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swipehire
DB_USER=postgres
DB_PASSWORD=password
REDIS_URL=redis://localhost:6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
CLIENT_URL=http://localhost:3000
EOF
    echo "✅ Created server/.env"
fi

# Start services with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Initialize database
echo "🗄️ Initializing database..."
docker-compose exec -T server npm run db:init

# Seed sample data
echo "🌱 Seeding sample data..."
curl -s -X POST http://localhost:3001/api/startups/seed > /dev/null

# Create admin account
echo "👤 Creating admin account..."
echo ""
echo "Please enter admin details:"
read -p "Email: " ADMIN_EMAIL
read -s -p "Password: " ADMIN_PASSWORD
echo ""
read -p "First Name: " ADMIN_FIRSTNAME
read -p "Last Name: " ADMIN_LASTNAME

# Create admin via API
curl -s -X POST http://localhost:3001/api/setup/setup-admin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"firstName\":\"$ADMIN_FIRSTNAME\",\"lastName\":\"$ADMIN_LASTNAME\"}" > /dev/null

# Seed admin company
curl -s -X POST http://localhost:3001/api/setup/seed-admin-company \
  -H "Content-Type: application/json" \
  -d "{\"adminEmail\":\"$ADMIN_EMAIL\"}" > /dev/null

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3001"
echo "   API Health: http://localhost:3001/api/health"
echo ""
echo "👤 Admin Account:"
echo "   Email: $ADMIN_EMAIL"
echo ""
echo "📋 Next steps:"
echo "   1. Open http://localhost in your browser"
echo "   2. Log in with your admin credentials"
echo "   3. Start swiping or go to /recruiter/dashboard for company view"
echo ""
echo "🛑 To stop: docker-compose down"
echo "🔄 To restart: docker-compose restart"