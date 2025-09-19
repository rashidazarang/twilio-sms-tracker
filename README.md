# 📱 Twilio SMS Tracker

## Open-Source SMS Communication Management System

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frashidazarang%2Ftwilio-sms-tracker&env=DATABASE_URL,TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_PHONE_NUMBER&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Frashidazarang%2Ftwilio-sms-tracker%23environment-variables&project-name=twilio-sms-tracker&repository-name=twilio-sms-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**Track SMS delivery • Monitor performance • Manage customer communications**

[**Live Demo**](https://sms-feedback-system-8xa1.vercel.app) • [**Documentation**](#-documentation) • [**Quick Start**](#-quick-start)

---

## 🎥 Demo Video

[demo-video.mp4](./demo-video.mp4)

Watch our comprehensive walkthrough demonstrating all features and setup process.

## 📸 Screenshots

### Dashboard - Real-time SMS Metrics
![Dashboard Screenshot](./images/desktop-dashboard.png)

*Monitor delivery rates, track failed messages, and manage SMS campaigns from a centralized dashboard*

### Message Configuration
![Messages Configuration](./images/desktop-messages.png)

*Customize SMS templates with dynamic variables and preview messages before sending*

### Analytics Dashboard
![Analytics Dashboard](./images/desktop-analytics.png)

*Track performance metrics, daily trends, and top-performing dealerships*

### Webhook Settings
![Settings Page](./images/desktop-settings.png)

*Professional webhook documentation with live testing capabilities*

### Mobile Responsive Design
![Mobile Dashboard](./images/mobile-dashboard.png)

*Fully responsive interface optimized for mobile devices*

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📊 Real-time Dashboard
- Live SMS delivery metrics
- Status tracking (delivered, failed, pending)
- Quick actions toolbar
- Export to CSV functionality
- Multiple view modes (Table/Card/List)

### 📝 Message Configuration  
- Customizable SMS templates
- Dynamic variable support
- Real-time preview
- Review platform integration
- Character count validation

</td>
<td width="50%">

### 📈 Analytics & Reporting
- Performance metrics
- Daily activity charts
- Success/failure rates
- Top dealerships ranking
- Hourly distribution analysis

### 🔌 Webhook Integration
- RESTful API endpoints
- Secure authentication
- Request/response logging
- Live testing tools
- Professional documentation

</td>
</tr>
</table>

## 🚀 Quick Start

Get up and running in **under 5 minutes**!

### Option 1: One-Click Deploy (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frashidazarang%2Ftwilio-sms-tracker)

### Option 2: Manual Setup

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

# Visit http://localhost:3000
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database (PostgreSQL) - Required
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Twilio - Optional (Required for SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Security - Required
WEBHOOK_API_KEY=your-secure-api-key-here

# Application - Required
FEEDBACK_BASE_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### Database Setup

#### Using Neon (Recommended - Free Tier Available)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy connection string
4. Run migrations in SQL editor

#### Using PostgreSQL

```sql
-- Run the migration script
psql -d your_database -f database/migrations/001_initial_schema.sql
```

## 📚 Documentation

### API Reference

#### Webhook Endpoint

```http
POST /webhook/transaction-complete
Content-Type: application/json
x-api-key: your-api-key

{
  "transactionId": "TXN-123456",
  "customerPhone": "+14155551234",
  "customerName": "John Doe",
  "dealershipName": "ABC Motors",
  "amount": 299.99
}
```

#### Dashboard API

```http
GET /api/dashboard?page=1&limit=20
```

#### Retry Failed Messages

```http
POST /api/retry/bulk
x-api-key: your-api-key
```

### Project Structure

```
twilio-sms-tracker/
├── 📁 api/              # API endpoints & serverless functions
├── 📁 public/           # Frontend HTML files
│   ├── index.html       # Dashboard
│   ├── messages.html    # Message configuration
│   ├── analytics.html   # Analytics dashboard
│   └── settings.html    # Webhook settings
├── 📁 database/         # Database migrations
├── 📁 src/              # Source code
│   ├── services/        # Business logic
│   └── utils/           # Utilities
├── 📄 .env.example      # Environment template
├── 📄 vercel.json       # Deployment config
└── 📄 package.json      # Dependencies
```

## 🛠️ Technology Stack

| Frontend | Backend | Database | Deployment |
|----------|---------|----------|------------|
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) | ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) | ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge) | ![Neon](https://img.shields.io/badge/Neon-00E5A0?style=for-the-badge) | ![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white) |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) | | |
| ![Alpine.js](https://img.shields.io/badge/Alpine.js-8BC0D0?style=for-the-badge&logo=alpine.js&logoColor=black) | ![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white) | | |

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

## 📈 Roadmap

- [x] Core dashboard functionality
- [x] Webhook integration
- [x] Message templates
- [x] Analytics dashboard
- [ ] Multi-user support
- [ ] Scheduled messaging
- [ ] A/B testing for templates
- [ ] Advanced reporting
- [ ] Email notifications
- [ ] Slack integration

## 💡 Use Cases

- **🚗 Automotive Dealerships** - Track service follow-ups and customer satisfaction
- **🏥 Healthcare Providers** - Appointment reminders and patient feedback
- **🏢 Service Businesses** - Customer communication and review collection
- **🛍️ E-commerce** - Order updates and delivery notifications
- **🏫 Educational Institutions** - Student notifications and parent communications

## 🔒 Security

- API key authentication
- Environment variable protection
- SQL injection prevention
- XSS protection
- Rate limiting support
- Audit logging

## 📊 Performance

- **Response Time**: < 500ms API responses
- **Throughput**: 10,000+ messages/day
- **Uptime**: 99.9% availability target
- **Scalability**: Horizontal scaling ready

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vercel](https://vercel.com) serverless functions
- Database hosting by [Neon](https://neon.tech)
- SMS delivery by [Twilio](https://www.twilio.com)
- Icons from [Heroicons](https://heroicons.com)

## 📞 Support

| Type | Link |
|------|------|
| 💬 **Discussions** | [GitHub Discussions](https://github.com/rashidazarang/twilio-sms-tracker/discussions) |
| 🐛 **Bug Reports** | [GitHub Issues](https://github.com/rashidazarang/twilio-sms-tracker/issues) |
| 📧 **Email** | support@example.com |
| 📖 **Docs** | [Documentation](https://github.com/rashidazarang/twilio-sms-tracker/wiki) |

---

**Built with ❤️ for the business community**

⭐ Star us on GitHub — it helps!

[**Website**](https://example.com) • [**Blog**](https://blog.example.com) • [**Twitter**](https://twitter.com/example)