# 📱 Twilio SMS Tracker

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frashidazarang%2Ftwilio-sms-tracker&env=DATABASE_URL,TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_PHONE_NUMBER&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Frashidazarang%2Ftwilio-sms-tracker%23environment-variables&project-name=twilio-sms-tracker&repository-name=twilio-sms-tracker)

A production-ready SMS feedback system for dealerships and businesses to track customer communication, monitor delivery rates, and manage feedback campaigns. Built with Node.js, Express, and vanilla JavaScript for maximum simplicity and performance.

## 🌟 Features

- **Real-time Dashboard** - Monitor SMS delivery rates, failures, and pending messages
- **Message Configuration** - Customize SMS templates with dynamic variables
- **Analytics** - Track performance metrics and delivery trends
- **Webhook Integration** - Professional webhook endpoint for transaction-based SMS triggers
- **Mobile Responsive** - Fully responsive design that works on all devices
- **No Framework Dependencies** - Pure vanilla JavaScript with Alpine.js for reactivity

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (we recommend [Neon](https://neon.tech) for serverless)
- Twilio account for SMS (optional for testing)
- Vercel account for deployment

### 1. Clone & Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frashidazarang%2Ftwilio-sms-tracker)

Or deploy manually:

```bash
# Clone the repository
git clone https://github.com/rashidazarang/twilio-sms-tracker.git
cd twilio-sms-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Twilio (Optional - for SMS functionality)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhook Security
WEBHOOK_API_KEY=sms-webhook-secure-2024

# Application
NODE_ENV=production
SEND_IMMEDIATE=false
FEEDBACK_BASE_URL=https://your-domain.vercel.app
```

### 3. Database Setup

#### Option A: Using Neon (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add it to your `.env` as `DATABASE_URL`

#### Option B: Manual PostgreSQL

Run the migration script:

```sql
-- Create transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(100),
  dealership_name VARCHAR(100),
  amount DECIMAL(10,2),
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create message configuration table
CREATE TABLE message_config (
  id SERIAL PRIMARY KEY,
  google_review_url VARCHAR(500),
  trustpilot_url VARCHAR(500),
  message_template TEXT,
  delay_hours INTEGER DEFAULT 24,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO message_config (google_review_url, trustpilot_url, message_template, delay_hours)
VALUES (
  'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review',
  'https://www.trustpilot.com/review/YOUR_BUSINESS',
  'Hi {customer_name}! Thank you for your recent visit to {dealership_name}. We would love to hear about your experience. Please share your feedback:',
  24
);
```

## 📊 Dashboard Overview

### Main Dashboard
- **Real-time Metrics**: Track total sent, delivery rate, pending, and failed messages
- **Message Log**: View detailed logs with status, error codes, and actions
- **Quick Actions**: Export to CSV, view analytics, access Twilio settings

### Message Configuration
- Set Google Reviews and Trustpilot URLs
- Customize SMS templates with variables:
  - `{customer_name}` - Customer's full name
  - `{dealership_name}` - Dealership name
  - `{amount}` - Transaction amount

### Analytics
- Total messages sent over time
- Success/failure rates
- Daily activity charts
- Top performing dealerships

### Settings (Webhook)
- Professional webhook documentation
- Copy-ready endpoint URL
- Required headers and request format
- Test webhook functionality

## 🔌 Webhook Integration

### Endpoint
```
POST https://your-domain.vercel.app/webhook/transaction-complete
```

### Headers
```json
{
  "Content-Type": "application/json",
  "x-api-key": "sms-webhook-secure-2024"
}
```

### Request Body
```json
{
  "transactionId": "TEST-1234567890",
  "customerPhone": "+14155552671",
  "customerName": "John Doe",
  "dealershipName": "ABC Motors",
  "amount": 299.99
}
```

### Optional URL Parameters
- `?customer_name={string}` - Override customer name
- `?dealership_name={string}` - Override dealership name

## 📁 Project Structure

```
twilio-sms-tracker/
├── api/
│   └── index.ts          # Main API endpoints
├── public/
│   ├── index.html        # Dashboard
│   ├── messages.html     # Message configuration
│   ├── analytics.html    # Analytics page
│   └── settings.html     # Webhook settings
├── src/
│   └── utils/
│       └── logger.ts     # Logging utility
├── vercel.json          # Vercel configuration
├── package.json         # Dependencies
└── README.md           # This file
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run db:migrate` - Run database migrations

## 🚢 Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect your GitHub account to Vercel
3. Import the project
4. Add environment variables
5. Deploy!

### Manual Deployment

The application can be deployed to any Node.js hosting service:

1. Build the application: `npm run build`
2. Set environment variables on your hosting platform
3. Start the application: `npm start`

## 📝 Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://...` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | No | `ACxxxxx...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | No | `xxxxx...` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | No | `+1234567890` |
| `WEBHOOK_API_KEY` | API key for webhook auth | Yes | `your-secure-key` |
| `SEND_IMMEDIATE` | Send SMS immediately | No | `true` or `false` |
| `FEEDBACK_BASE_URL` | Your app's base URL | Yes | `https://...` |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vercel](https://vercel.com) serverless functions
- Database by [Neon](https://neon.tech)
- SMS by [Twilio](https://www.twilio.com)
- UI components inspired by [Tailwind UI](https://tailwindui.com)

## 💬 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for the automotive industry