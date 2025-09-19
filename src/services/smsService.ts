import twilio from 'twilio';
import { logger } from '../utils/logger';

interface SMSMessage {
  to: string;
  body: string;
  transactionId: string;
}

export class SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private messagingServiceSid?: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(accountSid, authToken);
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  }

  async sendSMS(message: SMSMessage): Promise<string> {
    try {
      const messageOptions: any = {
        body: message.body,
        to: message.to,
      };

      if (this.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.messagingServiceSid;
      } else {
        messageOptions.from = this.fromNumber;
      }

      const result = await this.client.messages.create(messageOptions);
      
      logger.info('SMS sent successfully', {
        transactionId: message.transactionId,
        messageSid: result.sid,
        to: message.to,
      });

      return result.sid;
    } catch (error) {
      logger.error('Failed to send SMS', {
        transactionId: message.transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        to: message.to,
      });
      throw error;
    }
  }

  formatFeedbackMessage(firstName: string, salesRep: string, reviewLink: string): string {
    return `Hello ${firstName}, this is America First, your new vehicle protection partner. Please give us your feedback on ${salesRep} by clicking the link below:\n\n${reviewLink}`;
  }
}