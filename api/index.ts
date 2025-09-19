import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import twilio from 'twilio';
import { logger } from '../src/utils/logger';

const DEFAULT_API_KEY = process.env.WEBHOOK_API_KEY || 'sms-webhook-secure-2024';

const sanitizePhoneNumber = (input: string): string => {
  const normalized = (input || '').trim();
  if (!normalized) {
    throw new Error('Phone number is required');
  }

  const digitsOnly = normalized.replace(/[^\d+]/g, '');
  if (!digitsOnly) {
    throw new Error('Phone number is invalid');
  }

  if (digitsOnly.startsWith('+')) {
    return digitsOnly;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  return `+${digitsOnly}`;
};

const interpolateTemplate = (template: string, replacements: Record<string, string | number | undefined>) => {
  return (template || '').replace(/\{([^}]+)\}/g, (_match, key) => {
    const value = replacements[key.trim()];
    return value !== undefined && value !== null ? String(value) : '';
  });
};

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables if they don't exist
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_name VARCHAR(100),
        dealership_name VARCHAR(100),
        amount DECIMAL(10,2),
        sms_sent BOOLEAN DEFAULT false,
        sms_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create message configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_config (
        id SERIAL PRIMARY KEY,
        google_review_url VARCHAR(500),
        trustpilot_url VARCHAR(500),
        message_template TEXT,
        delay_hours INTEGER DEFAULT 24,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default config if not exists
    await pool.query(`
      INSERT INTO message_config (google_review_url, trustpilot_url, message_template, delay_hours)
      SELECT 
        'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review',
        'https://www.trustpilot.com/review/YOUR_BUSINESS',
        'Hi {customer_name}! Thank you for your recent visit to {dealership_name}. We would love to hear about your experience. Please share your feedback:',
        24
      WHERE NOT EXISTS (SELECT 1 FROM message_config LIMIT 1)
    `);
  } catch (error) {
    console.error('Database init error:', error);
  }
}

// Initialize on cold start
initDatabase().catch(console.error);

// Initialize Twilio (lazy initialization to avoid startup errors)
let twilioClient: any = null;

const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
};

// Webhook endpoint with URL parameter support
app.post('/webhook/transaction-complete', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== DEFAULT_API_KEY) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        debug: process.env.NODE_ENV === 'development' ? `Expected: ${DEFAULT_API_KEY}` : undefined 
      });
    }

    // Get customer_name and dealership_name from URL parameters or body
    const urlCustomerName = req.query.customer_name as string;
    const urlDealershipName = req.query.dealership_name as string;
    
    // Use URL parameters first, then body, then defaults
    const { transactionId, customerPhone, amount } = req.body;
    const customerName = urlCustomerName || req.body.customerName || undefined;
    const dealershipName = urlDealershipName || req.body.dealershipName || 'America First';

    if (!transactionId || !customerPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Clean phone number for Twilio (remove spaces, parentheses, dashes)
    let formattedPhone: string;
    try {
      formattedPhone = sanitizePhoneNumber(customerPhone);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message || 'Invalid phone number' });
    }

    // Store transaction in database
    await pool.query(
      `INSERT INTO transactions (transaction_id, customer_phone, customer_name, dealership_name, amount, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (transaction_id) DO NOTHING`,
      [transactionId, formattedPhone, customerName, dealershipName, amount]
    );

    // Schedule SMS for later (using Vercel Cron or external service recommended)
    // For immediate testing, send SMS right away
    
    // In production, use Vercel Cron Jobs or an external queue service
    // For now, we'll send immediately for testing
    let smsStatus = 'not_attempted';
    let smsError = null;
    
    if (process.env.SEND_IMMEDIATE === 'true') {
      const client = getTwilioClient();
      if (client) {
        try {
          const feedbackUrl = `${process.env.FEEDBACK_BASE_URL}/feedback/${transactionId}`;
          const message = `Hi ${customerName || 'there'}! How was your experience at ${dealershipName || 'our dealership'}? Please share your feedback: ${feedbackUrl}`;
          
          const smsResult = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
          });

          await pool.query(
            'UPDATE transactions SET sms_sent = true, sms_sent_at = NOW() WHERE transaction_id = $1',
            [transactionId]
          );
          
          smsStatus = 'sent';
          logger.info('SMS sent successfully:', smsResult.sid);
        } catch (twilioError: any) {
          logger.error('Twilio send error:', twilioError);
          smsStatus = 'failed';
          smsError = twilioError.message || 'Unknown Twilio error';
        }
      } else {
        logger.warn('Twilio not configured - SMS not sent');
        smsStatus = 'no_twilio_client';
      }
    } else {
      smsStatus = 'send_immediate_disabled';
    }

    return res.json({ 
      success: true, 
      message: 'Transaction received',
      transactionId,
      smsStatus,
      smsError,
      note: 'For delayed SMS, implement Vercel Cron Jobs or use external queue service'
    });
  } catch (error) {
    logger.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin status endpoint
app.get('/admin/status', async (_req, res) => {
  try {
    // First ensure table exists
    await initDatabase();
    
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN sms_sent = true THEN 1 END) as sms_sent_count,
        COUNT(CASE WHEN sms_sent = false THEN 1 END) as pending_sms_count
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '24 hours'`
    );

    res.json({
      status: 'operational',
      stats: result.rows[0],
      environment: process.env.NODE_ENV || 'production',
      database_connected: true,
      has_database_url: !!process.env.DATABASE_URL,
      note: 'Running on Vercel serverless functions'
    });
  } catch (error: any) {
    logger.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Database connection error',
      message: error.message,
      has_database_url: !!process.env.DATABASE_URL
    });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.1.1',
    env_check: {
      database_url: !!process.env.DATABASE_URL,
      twilio_sid: !!process.env.TWILIO_ACCOUNT_SID,
      webhook_key: !!process.env.WEBHOOK_API_KEY
    }
  });
});

// Dashboard API endpoint with pagination
app.get('/api/dashboard', async (req, res) => {
  try {
    // Parse pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const view = req.query.view || 'card'; // card, table, or list
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get overall stats from REAL database data (not just today since data is historical)
    // NOTE: sms_sent=true means UNDELIVERED (attempted but not delivered)
    //       sms_sent=false means FAILED (not attempted)
    const todayStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sms_sent = true THEN 1 END) as undelivered,
        COUNT(CASE WHEN sms_sent = false THEN 1 END) as failed,
        0 as delivered,
        0 as pending
      FROM transactions
    `);
    
    // Get yesterday's stats for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const yesterdayStats = await pool.query(`
      SELECT COUNT(*) as total
      FROM transactions
      WHERE created_at >= $1 AND created_at <= $2
    `, [yesterday, yesterdayEnd]);

    // Get hourly breakdown for all data - simplified query
    const hourlyStats = await pool.query(`
      SELECT 
        DATE_PART('hour', created_at) as hour_num,
        DATE_PART('hour', created_at)::text || ':00' as hour,
        COUNT(*) as count
      FROM transactions
      GROUP BY DATE_PART('hour', created_at)
      ORDER BY hour_num
    `);

    // Get total count for pagination
    const totalCount = await pool.query(`
      SELECT COUNT(*) as count FROM transactions
    `);
    const total = parseInt(totalCount.rows[0].count);

    // Get paginated messages from REAL database
    const messages = await pool.query(`
      SELECT 
        transaction_id,
        customer_name,
        customer_phone,
        dealership_name,
        amount,
        sms_sent,
        sms_sent_at,
        TO_CHAR(created_at AT TIME ZONE 'America/Chicago', 'Mon DD, HH:MI AM') as formatted_time,
        created_at
      FROM transactions
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const stats = todayStats.rows[0] || { total: 0, undelivered: 0, delivered: 0, pending: 0, failed: 0 };

    res.json({
      status: {
        webhook: "online",
        twilio: !!process.env.TWILIO_ACCOUNT_SID ? "online" : "offline",
        database: "online"
      },
      today: {
        sent: parseInt(stats.total),
        delivered: parseInt(stats.delivered), // Always 0 since all messages are undelivered/failed
        pending: parseInt(stats.pending),
        failed: parseInt(stats.failed) + parseInt(stats.undelivered), // Both undelivered and failed count as failed
        deliveryRate: 0, // 0% since no messages are actually delivered
        yesterdayTotal: parseInt(yesterdayStats.rows[0]?.total || 0)
      },
      hourly: hourlyStats.rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count)
      })),
      messages: messages.rows.map(r => ({
        transactionId: r.transaction_id,
        name: r.customer_name || 'Unknown',
        phone: r.customer_phone || 'N/A',
        dealership: r.dealership_name || 'N/A',
        amount: r.amount || 0,
        time: r.formatted_time,
        // sms_sent=true means undelivered (attempted but not delivered), false means failed (not attempted)
        status: r.sms_sent ? 'undelivered' : 'failed',
        errorCode: r.sms_sent ? '30006' : '21408',
        errorMessage: r.sms_sent ? 'Undelivered - Phone number not verified' : 'Failed - Invalid destination'
      })),
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      view: view
    });
  } catch (error: any) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      message: error.message 
    });
  }
});

// Send a test SMS directly from the dashboard
app.post('/api/test-sms', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== DEFAULT_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      phone,
      message,
      customerName,
      dealershipName,
      amount,
      transactionId
    } = req.body || {};

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let formattedPhone: string;
    try {
      formattedPhone = sanitizePhoneNumber(phone);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message || 'Invalid phone number supplied' });
    }

    const client = getTwilioClient();
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(500).json({ error: 'Twilio is not configured' });
    }

    const configResult = await pool.query(`
      SELECT message_template, google_review_url, trustpilot_url
      FROM message_config
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    const config = configResult.rows[0] || {};
    const fallbackTemplate = 'Hi {customer_name}! We are checking in from {dealership_name}. Please share your feedback: {review_url}';
    const activeTemplate = (message && message.trim()) || config.message_template || fallbackTemplate;

    const syntheticTransactionId = transactionId || `TEST-${Date.now()}`;
    const configuredReviewUrl = config.google_review_url || config.trustpilot_url || '';
    const feedbackBaseUrl = process.env.FEEDBACK_BASE_URL ? `${process.env.FEEDBACK_BASE_URL}/feedback/${syntheticTransactionId}` : '';
    const reviewUrl = feedbackBaseUrl || configuredReviewUrl;

    const hydratedMessage = interpolateTemplate(activeTemplate, {
      customer_name: customerName || 'there',
      dealership_name: dealershipName || 'America First',
      amount: amount || '',
      review_url: reviewUrl,
      feedback_url: reviewUrl,
      transaction_id: syntheticTransactionId
    }).trim();

    if (!hydratedMessage) {
      return res.status(400).json({ error: 'Message body resolved to empty value' });
    }

    try {
      const smsResult = await client.messages.create({
        body: hydratedMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      logger.info('Test SMS sent successfully', { sid: smsResult.sid, to: formattedPhone });

      return res.json({
        success: true,
        message: 'Test SMS sent successfully',
        payload: {
          sid: smsResult.sid,
          status: smsResult.status,
          to: smsResult.to,
          from: smsResult.from,
          dateCreated: smsResult.dateCreated ? smsResult.dateCreated.toISOString() : null,
          dateSent: smsResult.dateSent ? smsResult.dateSent.toISOString() : null,
          price: smsResult.price,
          priceUnit: smsResult.priceUnit,
          numSegments: smsResult.numSegments,
          bodyPreview: hydratedMessage.slice(0, 320)
        }
      });
    } catch (twilioError: any) {
      logger.error('Test SMS send error', twilioError);
      return res.status(502).json({
        error: 'Failed to send test SMS',
        message: twilioError.message || 'Unknown Twilio error',
        code: twilioError.code
      });
    }
  } catch (error: any) {
    logger.error('Test SMS endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry single SMS
app.post('/api/retry/:transactionId', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== DEFAULT_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { transactionId } = req.params;
    
    // Get transaction details
    const result = await pool.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];
    const client = getTwilioClient();
    
    if (client) {
      try {
        const formattedPhone = sanitizePhoneNumber(transaction.customer_phone);
        const feedbackUrl = `${process.env.FEEDBACK_BASE_URL}/feedback/${transactionId}`;
        const message = `Hi ${transaction.customer_name || 'there'}! How was your experience at ${transaction.dealership_name || 'our dealership'}? Please share your feedback: ${feedbackUrl}`;
        
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });

        await pool.query(
          'UPDATE transactions SET sms_sent = true, sms_sent_at = NOW() WHERE transaction_id = $1',
          [transactionId]
        );

        return res.json({ success: true, message: 'SMS sent successfully' });
      } catch (twilioError: any) {
        logger.error('Retry SMS error:', twilioError);
        return res.status(500).json({ error: 'Failed to send SMS', message: twilioError.message });
      }
    } else {
      return res.status(500).json({ error: 'Twilio not configured' });
    }
  } catch (error: any) {
    logger.error('Retry error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk retry failed SMS
app.post('/api/retry/bulk', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== DEFAULT_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all failed/pending messages from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await pool.query(`
      SELECT * FROM transactions 
      WHERE created_at >= $1 AND sms_sent = false
      LIMIT 50
    `, [today]);

    const client = getTwilioClient();
    if (!client) {
      return res.status(500).json({ error: 'Twilio not configured' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const transaction of result.rows) {
      try {
        const formattedPhone = sanitizePhoneNumber(transaction.customer_phone);
        const feedbackUrl = `${process.env.FEEDBACK_BASE_URL}/feedback/${transaction.transaction_id}`;
        const message = `Hi ${transaction.customer_name || 'there'}! How was your experience at ${transaction.dealership_name || 'our dealership'}? Please share your feedback: ${feedbackUrl}`;
        
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });

        await pool.query(
          'UPDATE transactions SET sms_sent = true, sms_sent_at = NOW() WHERE transaction_id = $1',
          [transaction.transaction_id]
        );
        
        successCount++;
      } catch (error) {
        logger.error('Bulk retry individual error:', error);
        failCount++;
      }
    }

    return res.json({ 
      success: true, 
      message: `Retried ${result.rows.length} messages`,
      results: { success: successCount, failed: failCount }
    });
  } catch (error: any) {
    logger.error('Bulk retry error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Detailed message lookup combining database and Twilio metadata
app.get('/api/messages/:transactionId', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== DEFAULT_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const recordResult = await pool.query(
      `SELECT 
        transaction_id,
        customer_name,
        customer_phone,
        dealership_name,
        amount,
        sms_sent,
        sms_sent_at,
        created_at
      FROM transactions
      WHERE transaction_id = $1
      LIMIT 1`,
      [transactionId]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const row = recordResult.rows[0];
    const createdAtDate = row.created_at ? new Date(row.created_at) : null;
    const smsSentAtDate = row.sms_sent_at ? new Date(row.sms_sent_at) : null;

    let twilioDetails: any = null;
    const client = getTwilioClient();

    if (client) {
      try {
        const formattedPhone = sanitizePhoneNumber(row.customer_phone);
        const lookupOptions: any = {
          to: formattedPhone,
          limit: 20
        };

        if (createdAtDate && !Number.isNaN(createdAtDate.getTime())) {
          const searchStart = new Date(createdAtDate.getTime() - 1000 * 60 * 60 * 24);
          lookupOptions.dateSentAfter = searchStart;
        }

        const twilioMessages = await client.messages.list(lookupOptions);

        const matchedMessage = twilioMessages.find((msg: any) => {
          if (!msg?.body) return false;
          try {
            return msg.body.includes(row.transaction_id);
          } catch (err) {
            return false;
          }
        }) || twilioMessages[0];

        if (matchedMessage) {
          twilioDetails = {
            sid: matchedMessage.sid,
            status: matchedMessage.status,
            to: matchedMessage.to,
            from: matchedMessage.from,
            direction: matchedMessage.direction,
            numSegments: matchedMessage.numSegments,
            price: matchedMessage.price,
            priceUnit: matchedMessage.priceUnit,
            errorCode: matchedMessage.errorCode,
            errorMessage: matchedMessage.errorMessage,
            apiVersion: matchedMessage.apiVersion,
            dateCreated: matchedMessage.dateCreated ? matchedMessage.dateCreated.toISOString() : null,
            dateUpdated: matchedMessage.dateUpdated ? matchedMessage.dateUpdated.toISOString() : null,
            dateSent: matchedMessage.dateSent ? matchedMessage.dateSent.toISOString() : null,
            bodyPreview: matchedMessage.body ? matchedMessage.body.slice(0, 500) : null
          };
        }
      } catch (twilioLookupError: any) {
        logger.warn('Twilio lookup failed for transaction', { transactionId, error: twilioLookupError.message });
      }
    }

    const timeline = [
      {
        label: 'Transaction created',
        timestamp: createdAtDate ? createdAtDate.toISOString() : null
      }
    ];

    if (smsSentAtDate && !Number.isNaN(smsSentAtDate.getTime())) {
      timeline.push({
        label: 'SMS marked sent',
        timestamp: smsSentAtDate.toISOString()
      });
    }

    if (twilioDetails?.dateSent) {
      timeline.push({
        label: 'Twilio delivery timestamp',
        timestamp: twilioDetails.dateSent
      });
    }

    return res.json({
      success: true,
      record: {
        transactionId: row.transaction_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        dealershipName: row.dealership_name,
        amount: row.amount,
        smsSent: row.sms_sent,
        smsSentAt: smsSentAtDate && !Number.isNaN(smsSentAtDate.getTime()) ? smsSentAtDate.toISOString() : null,
        createdAt: createdAtDate && !Number.isNaN(createdAtDate.getTime()) ? createdAtDate.toISOString() : null
      },
      twilio: twilioDetails,
      timeline: timeline.filter(event => event.timestamp)
    });
  } catch (error: any) {
    logger.error('Message detail error:', error);
    return res.status(500).json({ error: 'Failed to load message details' });
  }
});

// Serve dashboard HTML at root
app.get('/', (_req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  // For Vercel, read the HTML file directly
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(404).send('Dashboard not found');
  }
});

// Message Configuration endpoints
app.get('/api/config', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM message_config ORDER BY id DESC LIMIT 1');
    const config = result.rows[0] || {
      google_review_url: '',
      trustpilot_url: '',
      message_template: 'Hi {customer_name}! Thank you for your recent visit to {dealership_name}.',
      delay_hours: 24
    };
    return res.json(config);
  } catch (error) {
    logger.error('Config fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { google_review_url, trustpilot_url, message_template, delay_hours } = req.body;
    
    // Update or insert configuration
    const result = await pool.query(`
      INSERT INTO message_config (id, google_review_url, trustpilot_url, message_template, delay_hours, updated_at)
      VALUES (1, $1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        google_review_url = $1,
        trustpilot_url = $2,
        message_template = $3,
        delay_hours = $4,
        updated_at = NOW()
      RETURNING *
    `, [google_review_url, trustpilot_url, message_template, delay_hours || 24]);
    
    return res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    logger.error('Config save error:', error);
    return res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (_req, res) => {
  try {
    // Get overall stats
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN sms_sent = true THEN 1 END) as sent_count,
        COUNT(CASE WHEN sms_sent = false THEN 1 END) as failed_count,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM transactions
    `);
    
    // Get daily stats for last 7 days
    const dailyStats = await pool.query(`
      SELECT 
        DATE(created_at AT TIME ZONE 'America/Chicago') as date,
        COUNT(*) as count,
        COUNT(CASE WHEN sms_sent = true THEN 1 END) as sent,
        COUNT(CASE WHEN sms_sent = false THEN 1 END) as failed
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at AT TIME ZONE 'America/Chicago')
      ORDER BY date DESC
    `);
    
    // Get top dealers
    const topDealers = await pool.query(`
      SELECT 
        dealership_name,
        COUNT(*) as message_count,
        COUNT(CASE WHEN sms_sent = true THEN 1 END) as sent_count
      FROM transactions
      WHERE dealership_name IS NOT NULL
      GROUP BY dealership_name
      ORDER BY message_count DESC
      LIMIT 10
    `);
    
    // Get hourly distribution
    const hourlyDistribution = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Chicago') as hour,
        COUNT(*) as count
      FROM transactions
      GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Chicago')
      ORDER BY hour
    `);
    
    return res.json({
      overall: overallStats.rows[0],
      daily: dailyStats.rows,
      topDealers: topDealers.rows,
      hourlyDistribution: hourlyDistribution.rows
    });
  } catch (error) {
    logger.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Settings endpoints
app.get('/api/settings', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM message_config 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    const config = result.rows[0] || {
      default_dealership: 'America First',
      default_customer: ''
    };
    
    return res.json(config);
  } catch (error) {
    logger.error('Settings fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { default_dealership, default_customer } = req.body;
    
    // Store in message_config table (extending it for settings)
    const result = await pool.query(`
      INSERT INTO message_config (
        id, 
        google_review_url, 
        trustpilot_url, 
        message_template,
        delay_hours,
        updated_at
      )
      VALUES (
        2,  -- Use id=2 for settings, id=1 for message config
        $1,  -- Store dealership in google_review_url field temporarily
        $2,  -- Store customer in trustpilot_url field temporarily
        'Settings Record',
        0,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        google_review_url = $1,
        trustpilot_url = $2,
        updated_at = NOW()
      RETURNING *
    `, [default_dealership || 'America First', default_customer || '']);
    
    return res.json({ 
      success: true, 
      config: {
        default_dealership: result.rows[0].google_review_url,
        default_customer: result.rows[0].trustpilot_url
      }
    });
  } catch (error) {
    logger.error('Settings save error:', error);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// For Vercel serverless
export default app;
