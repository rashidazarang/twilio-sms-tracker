# 🚀 Twilio SMS Tracker - Complete Setup Guide

This guide will walk you through setting up the Twilio SMS Tracker from scratch to a fully deployed application.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Deploy (5 minutes)](#quick-deploy)
3. [Manual Setup](#manual-setup)
4. [Database Configuration](#database-configuration)
5. [Twilio Setup](#twilio-setup)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:
- [ ] GitHub account
- [ ] Vercel account (free tier works)
- [ ] Node.js 18+ installed locally (for development)
- [ ] PostgreSQL database (we'll set this up)

## Quick Deploy (5 minutes)

### Step 1: Deploy to Vercel

1. Click the deploy button below:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fsms-feedback-tracker)

2. Sign in to Vercel with your GitHub account

3. Configure your project:
   - **Project Name**: `sms-feedback-tracker` (or your choice)
   - **Framework Preset**: Other
   - **Root Directory**: `./`

### Step 2: Set Up Database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (free)

2. Create a new project:
   ```
   Project Name: sms-tracker-db
   Region: Choose closest to your location
   ```

3. Once created, copy your connection string:
   ```
   postgresql://username:password@host.neon.tech/dbname?sslmode=require
   ```

4. Run the migration script in Neon's SQL editor:
   - Go to the SQL Editor tab
   - Copy the entire contents of `database/migrations/001_initial_schema.sql`
   - Paste and run it
   - You should see "Database schema created successfully!"

### Step 3: Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add these variables:

   ```bash
   DATABASE_URL=your_neon_connection_string
   WEBHOOK_API_KEY=generate-a-secure-key-here
   FEEDBACK_BASE_URL=https://your-project.vercel.app
   NODE_ENV=production
   SEND_IMMEDIATE=false
   ```

4. Optional Twilio variables (for SMS):
   ```bash
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

5. Click "Save" and redeploy

### Step 4: Verify Deployment

1. Visit your deployed URL: `https://your-project.vercel.app`
2. You should see the dashboard
3. Navigate to Settings to see your webhook URL

## Manual Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/sms-feedback-tracker.git
cd sms-feedback-tracker

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Step 2: Configure Local Environment

Edit `.env` file with your values:

```env
# Database (use local PostgreSQL for development)
DATABASE_URL=postgresql://postgres:password@localhost:5432/sms_tracker

# Webhook Security
WEBHOOK_API_KEY=local-dev-key-123

# Application
NODE_ENV=development
SEND_IMMEDIATE=true
FEEDBACK_BASE_URL=http://localhost:3000
PORT=3000
```

### Step 3: Set Up Local Database

```bash
# Create database
createdb sms_tracker

# Run migrations
psql -d sms_tracker -f database/migrations/001_initial_schema.sql

# Verify tables were created
psql -d sms_tracker -c "\dt"
```

### Step 4: Start Development Server

```bash
# Start with hot reload
npm run dev

# Visit http://localhost:3000
```

## Database Configuration

### Option 1: Neon (Recommended for Production)

1. **Sign up**: Go to [neon.tech](https://neon.tech)
2. **Create project**: Choose your region
3. **Get connection string**: Found in Connection Details
4. **Run migrations**: Use the SQL Editor

### Option 2: Supabase

1. **Sign up**: Go to [supabase.com](https://supabase.com)
2. **Create project**: Wait for provisioning
3. **Get connection string**: Settings → Database
4. **Run migrations**: SQL Editor tab

### Option 3: Local PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql # macOS
sudo apt-get install postgresql # Ubuntu

# Start PostgreSQL
brew services start postgresql # macOS
sudo systemctl start postgresql # Ubuntu

# Create database
createdb sms_tracker

# Run migrations
psql -d sms_tracker -f database/migrations/001_initial_schema.sql
```

## Twilio Setup

### Step 1: Create Twilio Account

1. Go to [twilio.com](https://www.twilio.com)
2. Sign up for a free trial account
3. Verify your phone number

### Step 2: Get Credentials

1. Go to Console Dashboard
2. Copy your Account SID
3. Copy your Auth Token
4. Get a phone number (free trial includes one)

### Step 3: Configure Webhook

1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your number
3. In "Messaging", set webhook URL:
   ```
   https://your-app.vercel.app/webhook/status
   ```

### Step 4: Test SMS Sending

```bash
# Test using curl
curl -X POST https://your-app.vercel.app/webhook/transaction-complete \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-key" \
  -d '{
    "transactionId": "TEST-001",
    "customerPhone": "+1234567890",
    "customerName": "John Doe",
    "dealershipName": "Test Dealer",
    "amount": 299.99
  }'
```

## Testing

### 1. Test Webhook Endpoint

```bash
# Health check
curl https://your-app.vercel.app/health

# Test webhook
curl -X POST https://your-app.vercel.app/webhook/transaction-complete \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"transactionId":"TEST-123","customerPhone":"+1234567890"}'
```

### 2. Import Test Data

```sql
-- Insert test transactions
INSERT INTO transactions (transaction_id, customer_phone, customer_name, dealership_name, amount)
VALUES 
  ('TEST-001', '+14155551234', 'John Doe', 'ABC Motors', 299.99),
  ('TEST-002', '+14155555678', 'Jane Smith', 'XYZ Auto', 450.00),
  ('TEST-003', '+14155559012', 'Bob Johnson', 'ABC Motors', 175.50);
```

### 3. Verify Dashboard

1. Visit `/index.html` - Should show message count
2. Visit `/analytics.html` - Should show charts
3. Visit `/settings.html` - Should show webhook URL

## Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: Connection refused
```
**Solution**: Check your DATABASE_URL and ensure PostgreSQL is running

#### Twilio Error
```
Error: Invalid Account SID
```
**Solution**: Verify your Twilio credentials in environment variables

#### Vercel Deployment Failed
```
Error: Build failed
```
**Solution**: Check build logs, ensure all dependencies are in package.json

#### No Messages Showing
**Solution**: 
1. Check database connection
2. Verify data exists: `SELECT COUNT(*) FROM transactions;`
3. Check browser console for errors

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

Check Vercel function logs:
```bash
vercel logs --follow
```

### Getting Help

1. **Documentation**: Check the README and PRD
2. **Issues**: Open an issue on GitHub
3. **Community**: Join our Discord server
4. **Email**: support@example.com

## Next Steps

After successful deployment:

1. **Configure SMS Templates**: Go to `/messages.html`
2. **Set Review URLs**: Add your Google/Trustpilot links
3. **Test Webhook**: Send a test transaction
4. **Monitor Analytics**: Check `/analytics.html`
5. **Customize**: Modify templates and styles

## Production Checklist

- [ ] Change default API key
- [ ] Enable HTTPS only
- [ ] Set up monitoring (Sentry/New Relic)
- [ ] Configure backups
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Test error handling
- [ ] Document API for your team

## Support

For issues or questions:
- 📧 Email: support@example.com
- 💬 Discord: [Join our server](https://discord.gg/example)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/sms-feedback-tracker/issues)

---

**Congratulations! 🎉** Your SMS Feedback Tracker is now deployed and ready to use!