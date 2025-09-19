import { Request, Response } from 'express';
import Joi from 'joi';
import { QueueService } from '../services/queueService';
import { logger } from '../utils/logger';

const transactionSchema = Joi.object({
  transactionId: Joi.string().required(),
  customerId: Joi.string().required(),
  customerFirstName: Joi.string().required(),
  customerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  salesRepName: Joi.string().required(),
  transactionCompletedAt: Joi.date().iso().required(),
});

export class WebhookController {
  private queueService: QueueService;

  constructor(queueService: QueueService) {
    this.queueService = queueService;
  }

  async handleTransactionComplete(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (apiKey !== process.env.API_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { error, value } = transactionSchema.validate(req.body);
      
      if (error) {
        logger.warn('Invalid webhook payload', { error: error.details });
        res.status(400).json({ 
          error: 'Invalid request', 
          details: error.details.map(d => d.message) 
        });
        return;
      }

      const job = await this.queueService.scheduleFeedbackSMS({
        ...value,
        transactionCompletedAt: new Date(value.transactionCompletedAt),
      });

      logger.info('Transaction webhook processed', {
        transactionId: value.transactionId,
        jobId: job.id,
      });

      res.status(200).json({
        success: true,
        message: 'Feedback SMS scheduled',
        jobId: job.id,
        scheduledFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      logger.error('Webhook processing error', { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async cancelFeedbackSMS(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.API_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const removed = await this.queueService.removeJob(transactionId);
      
      if (removed) {
        logger.info('Feedback SMS cancelled', { transactionId });
        res.status(200).json({
          success: true,
          message: 'Feedback SMS cancelled',
        });
      } else {
        res.status(404).json({
          error: 'Job not found',
          message: 'No pending SMS found for this transaction',
        });
      }
    } catch (error) {
      logger.error('Cancel SMS error', { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.API_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await this.queueService.getQueueStatus();
      
      res.status(200).json({
        success: true,
        queue: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get queue status error', { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'healthy',
      service: 'sms-feedback-system',
      timestamp: new Date().toISOString(),
    });
  }
}
