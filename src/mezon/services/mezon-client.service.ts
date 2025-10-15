import { Injectable, Logger } from '@nestjs/common';
import { MezonClient } from 'mezon-sdk';

@Injectable()
export class MezonClientService {
  private readonly logger = new Logger(MezonClientService.name);
  private client: MezonClient;

  constructor(botId: string, token: string) {
    console.log('MezonClientService initialized with botId:', botId);
    console.log('MezonClientService initialized with token:', token);
    this.client = new MezonClient({ botId, token });
  }

  async initializeClient() {
    try {
      const result = await this.client.login();
      this.logger.log('authenticated.', result);
    } catch (error) {
      this.logger.error('error authenticating.', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }
}
