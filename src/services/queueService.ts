import { Queue, Worker, Job } from 'bullmq';
import { pgPool } from '../config/database';
import { SMSService } from './smsService';
import { LinkRotationService } from './linkRotationService';
import { logger } from '../utils/logger';

export interface FeedbackJobData {
  transactionId: string;
  customerId: string;
  customerFirstName: string;
  customerPhone: string;
  salesRepName: string;
  transactionCompletedAt: Date;
}

export class QueueService {
  private queue: Queue<FeedbackJobData>;
  private worker: Worker<FeedbackJobData> | null = null;
  private smsService: SMSService;
  private linkRotationService: LinkRotationService;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('sms-feedback', { connection });
    this.smsService = new SMSService();
    this.linkRotationService = new LinkRotationService();
    
    this.setupWorker(connection);
  }

  private setupWorker(connection: any): void {
    this.worker = new Worker<FeedbackJobData>(
      'sms-feedback',
      async (job: Job<FeedbackJobData>) => {
        const { data } = job;
        logger.info('Processing SMS feedback job', { transactionId: data.transactionId });

        try {
          const { platform, url } = await this.linkRotationService.getNextReviewLink();
          
          const message = this.smsService.formatFeedbackMessage(
            data.customerFirstName,
            data.salesRepName,
            url
          );

          const messageSid = await this.smsService.sendSMS({
            to: data.customerPhone,
            body: message,
            transactionId: data.transactionId,
          });

          await pgPool.query(
            `UPDATE sms_feedback_jobs 
             SET status = 'sent', 
                 sent_at = CURRENT_TIMESTAMP, 
                 review_platform = $1,
                 review_link = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE transaction_id = $3`,
            [platform, url, data.transactionId]
          );

          logger.info('SMS feedback sent successfully', {
            transactionId: data.transactionId,
            messageSid,
            platform,
          });

          return { success: true, messageSid, platform };
        } catch (error) {
          logger.error('Failed to process SMS feedback job', {
            transactionId: data.transactionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          await pgPool.query(
            `UPDATE sms_feedback_jobs 
             SET status = 'failed', 
                 error_message = $1,
                 retry_count = retry_count + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE transaction_id = $2`,
            [error instanceof Error ? error.message : 'Unknown error', data.transactionId]
          );

          throw error;
        }
      },
      { connection }
    );

    this.worker.on('completed', (job) => {
      logger.info('Job completed', {
        jobId: job.id,
        transactionId: job.data.transactionId,
      });
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        logger.error('Job failed', {
          jobId: job.id,
          transactionId: job.data.transactionId,
          error: err.message,
        });
      }
    });
  }

  async scheduleFeedbackSMS(data: FeedbackJobData): Promise<Job<FeedbackJobData>> {
    const delayMinutes = parseInt(process.env.SMS_DELAY_MINUTES || '30', 10);
    const delayMs = delayMinutes * 60 * 1000;

    await pgPool.query(
      `INSERT INTO sms_feedback_jobs 
       (transaction_id, customer_id, customer_first_name, customer_phone, 
        sales_rep_name, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
       ON CONFLICT (transaction_id) DO NOTHING`,
      [
        data.transactionId,
        data.customerId,
        data.customerFirstName,
        data.customerPhone,
        data.salesRepName,
        new Date(Date.now() + delayMs),
      ]
    );

    const job = await this.queue.add('send-feedback-sms', data, {
      delay: delayMs,
      attempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    });

    logger.info('SMS feedback job scheduled', {
      transactionId: data.transactionId,
      jobId: job.id,
      scheduledFor: new Date(Date.now() + delayMs).toISOString(),
    });

    return job;
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async removeJob(transactionId: string): Promise<boolean> {
    const jobs = await this.queue.getJobs(['waiting', 'delayed']);
    const job = jobs.find(j => j.data?.transactionId === transactionId);
    
    if (job) {
      await job.remove();
      await pgPool.query(
        `UPDATE sms_feedback_jobs 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE transaction_id = $1`,
        [transactionId]
      );
      return true;
    }
    
    return false;
  }

  async close(): Promise<void> {
    if (!this.worker) {
      return;
    }

    await this.worker.close();
    await this.queue.close();
  }
}
