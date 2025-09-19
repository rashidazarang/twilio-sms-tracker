import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import { QueueService } from './services/queueService';
import { WebhookController } from './controllers/webhookController';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let queueService: QueueService;
let webhookController: WebhookController;

async function startServer() {
  try {
    logger.info('Initializing database...');
    await initializeDatabase();
    
    logger.info('Starting queue service...');
    queueService = new QueueService();
    webhookController = new WebhookController(queueService);
    
    app.get('/health', webhookController.healthCheck.bind(webhookController));
    
    app.post('/webhook/transaction-complete', 
      webhookController.handleTransactionComplete.bind(webhookController)
    );
    
    app.delete('/webhook/cancel/:transactionId', 
      webhookController.cancelFeedbackSMS.bind(webhookController)
    );
    
    app.get('/admin/queue-status', 
      webhookController.getQueueStatus.bind(webhookController)
    );
    
    app.listen(PORT, () => {
      logger.info(`SMS Feedback System running on port ${PORT}`);
      logger.info('Webhook endpoints:');
      logger.info(`  POST   http://localhost:${PORT}/webhook/transaction-complete`);
      logger.info(`  DELETE http://localhost:${PORT}/webhook/cancel/:transactionId`);
      logger.info(`  GET    http://localhost:${PORT}/admin/queue-status`);
      logger.info(`  GET    http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (queueService) {
    await queueService.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  if (queueService) {
    await queueService.close();
  }
  process.exit(0);
});

startServer();