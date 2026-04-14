# 🚀 SwipeHire - Quick Setup Guide

## STEP 1: Get Your API Keys

### 1. Stripe Account (Required for payments)
1. Go to https://dashboard.stripe.com/register
2. Create a free account
3. Get your API keys from: https://dashboard.stripe.com/test/apikeys
4. Copy the **Secret key** (starts with `sk_test_`)

### 2. Create Stripe Products
In your Stripe Dashboard:
1. Go to Products → Add Product
2. Create "Pro" plan:
   - Name: Pro
   - Price: $19.99
   - Recurring: Monthly
3. Create "Unlimited" plan:
   - Name: Unlimited  
   - Price: $39.99
   - Recurring: Monthly
4. Copy the Price IDs (start with `price_`)

### 3. Get Webhook Secret (for local testing)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
4. Copy the webhook signing secret (starts with `whsec_`)

## STEP 2: Update Environment Variables

Edit `/swipehire/server/.env` and replace:

```bash
# Database (use your PostgreSQL credentials)
DB_PASSWORD=your_actual_postgres_password

# JWT Secrets (generate secure random strings)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Stripe (paste your actual keys)
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET
STRIPE_PRO_PRICE_ID=price_YOUR_PRO_PRICE_ID
STRIPE_UNLIMITED_PRICE_ID=price_YOUR_UNLIMITED_PRICE_ID
```

## STEP 3: Start the Application

### Option A: With Docker (if available)
```bash
cd swipehire
docker compose up -d
docker compose exec server npm run db:init
curl -X POST http://localhost:3001/api/startups/seed
```

### Option B: Manual Setup

**Terminal 1 - Database:**
```bash
# Make sure PostgreSQL is running
# Create database:
createdb swipehire
```

**Terminal 2 - Backend:**
```bash
cd swipehire/server
npm install
npm run db:init
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd swipehire/client
npm install
npm run dev
```

**Terminal 4 - Stripe Webhook (optional):**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## STEP 4: Create Admin Account

Once the server is running:

```bash
curl -X POST http://localhost:3001/api/setup/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@swipehire.com",
    "password": "YourSecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

## STEP 5: Access Your App

- **Frontend**: http://localhost:5173 (or http://localhost:3000)
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

## STEP 6: Deploy to Production

### Railway (Easiest)
1. Push code to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub repo
4. Add environment variables in Railway dashboard
5. Deploy!

### Render
1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Add environment variables
6. Deploy!

## 📋 CHECKLIST

Before going live:
- [ ] Created Stripe account
- [ ] Added Stripe API keys to .env
- [ ] Created Stripe products (Pro & Unlimited)
- [ ] Generated JWT secrets
- [ ] Set database password
- [ ] Tested locally
- [ ] Created admin account
- [ ] Seeded sample data

## 🔗 USEFUL LINKS

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Railway**: https://railway.app
- **Render**: https://render.com

---

**Need help?** The app will work without Stripe for testing - just skip the payment steps and use the free tier!