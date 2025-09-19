import { redisClient } from '../config/database';
import { logger } from '../utils/logger';

export interface ReviewPlatform {
  name: string;
  url: string;
  weight: number;
}

export class LinkRotationService {
  private platforms: ReviewPlatform[] = [];
  private readonly ROTATION_KEY = 'sms:review:rotation:index';

  constructor() {
    this.platforms = [
      {
        name: 'google',
        url: process.env.GOOGLE_REVIEWS_URL || '',
        weight: 1,
      },
      {
        name: 'trustpilot',
        url: process.env.TRUSTPILOT_URL || '',
        weight: 1,
      },
    ];
  }

  async getNextReviewLink(): Promise<{ platform: string; url: string }> {
    try {
      const currentIndex = await this.getCurrentIndex();
      const nextIndex = (currentIndex + 1) % this.platforms.length;
      
      await this.setCurrentIndex(nextIndex);
      
      const selectedPlatform = this.platforms[currentIndex];
      
      logger.info('Selected review platform', {
        platform: selectedPlatform.name,
        index: currentIndex,
      });

      return {
        platform: selectedPlatform.name,
        url: selectedPlatform.url,
      };
    } catch (error) {
      logger.error('Error in link rotation', { error });
      return {
        platform: this.platforms[0].name,
        url: this.platforms[0].url,
      };
    }
  }

  private async getCurrentIndex(): Promise<number> {
    const index = await redisClient.get(this.ROTATION_KEY);
    return index ? parseInt(index, 10) : 0;
  }

  private async setCurrentIndex(index: number): Promise<void> {
    await redisClient.set(this.ROTATION_KEY, index.toString());
  }

  async getWeightedRandomLink(): Promise<{ platform: string; url: string }> {
    const totalWeight = this.platforms.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const platform of this.platforms) {
      random -= platform.weight;
      if (random <= 0) {
        return {
          platform: platform.name,
          url: platform.url,
        };
      }
    }
    
    return {
      platform: this.platforms[0].name,
      url: this.platforms[0].url,
    };
  }

  addPlatform(platform: ReviewPlatform): void {
    this.platforms.push(platform);
  }

  updatePlatformWeight(platformName: string, weight: number): void {
    const platform = this.platforms.find(p => p.name === platformName);
    if (platform) {
      platform.weight = weight;
    }
  }
}