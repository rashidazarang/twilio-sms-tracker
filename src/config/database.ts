import { Pool } from '@neondatabase/serverless';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Neon serverless Pool connects through the project's pooled endpoint defined by `DATABASE_URL`.
 * REST access (NEON_REST_API) is available for read-only operations via https://.../rest/v1 when needed.
 */
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis connected'));

export const initializeDatabase = async () => {
  
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS sms_feedback_jobs (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(255) UNIQUE NOT NULL,
      customer_id VARCHAR(255) NOT NULL,
      customer_first_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      sales_rep_name VARCHAR(100) NOT NULL,
      review_platform VARCHAR(50),
      review_link TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      scheduled_at TIMESTAMP NOT NULL,
      sent_at TIMESTAMP,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_status_scheduled ON sms_feedback_jobs(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_transaction_id ON sms_feedback_jobs(transaction_id);
  `);
};
