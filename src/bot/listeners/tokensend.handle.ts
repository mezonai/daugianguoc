import { OnEvent } from '@nestjs/event-emitter';
import { EMarkdownType, Events, MezonClient, TokenSentEvent } from 'mezon-sdk';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/bot/models/user.entity';
import { Repository, DataSource } from 'typeorm';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { BaseQueueProcessor } from 'src/bot/base/queue-processor.base';

@Injectable()
export class ListenerTokenSend extends BaseQueueProcessor<TokenSentEvent> {
  private client: MezonClient;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private clientService: MezonClientService,
    private dataSource: DataSource,
  ) {
    super('ListenerTokenSend', 1, 15000);
    this.client = this.clientService.getClient();
  }

  @OnEvent(Events.TokenSend)
  async handleRecharge(tokenEvent: TokenSentEvent) {
    if (tokenEvent.amount <= 0) return;
    const botId = process.env.BOT_ID;
    if (!botId) {
      console.error('BOT_ID is not defined');
      return;
    }

    if (tokenEvent.receiver_id === botId && tokenEvent.sender_id) {
      await this.addToQueue(tokenEvent);
    }
  }

  protected async processItem(tokenEvent: TokenSentEvent): Promise<void> {
    const amount = Number(tokenEvent.amount) || 0;
    const botId = process.env.BOT_ID;

    console.log('tokenEvent', tokenEvent);

    if (!botId) {
      throw new Error('BOT_ID is not defined');
    }

    try {
      const clan = this.client.clans.get('0');
      const mezonUser = await clan?.users.fetch(tokenEvent.sender_id as string);

      console.log('user', mezonUser);

      if (!mezonUser) {
        return;
      }

      // Check if user exists in database
      const dbUser = await this.userRepository.findOne({
        where: { user_id: tokenEvent.sender_id as string },
      });

      if (!dbUser) {
        // User doesn't exist in DB, create new user
        const newUser = new User();
        newUser.user_id = tokenEvent.sender_id as string;
        newUser.username = mezonUser.username || '';
        newUser.display_name = mezonUser.display_name || '';
        newUser.amount = amount;
        newUser.createdAt = Date.now();

        await this.userRepository.save(newUser);
        this.logger.log(`Created new user: ${newUser.user_id}`);
      } else {
        await this.userRepository
          .createQueryBuilder()
          .update()
          .set({ amount: () => 'amount + :amount' })
          .where('user_id = :user_id', {
            user_id: tokenEvent.sender_id,
            amount,
          })
          .execute();
      }

      const successMessage = `💸Nạp ${tokenEvent.amount.toLocaleString('vi-VN')} token thành công`;
      await mezonUser?.sendDM({
        t: successMessage,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: successMessage.length }],
      });
    } catch (error) {
      try {
        const dataSendToken = {
          sender_id: botId,
          sender_name: process.env.BOT_NAME || 'AUCTION-MEZON-BOT',
          receiver_id: tokenEvent.sender_id as string,
          amount: amount,
        };

        const clan = this.client.clans.get('0');
        const mezonUser = await clan?.users.fetch(
          tokenEvent.sender_id as string,
        );
        const successMessage = `💸Nạp không thành công ! ${tokenEvent.amount.toLocaleString('vi-VN')}  token  sẽ được hoàn lại`;

        await Promise.all([
          this.client.sendToken(dataSendToken),
          mezonUser?.sendDM({
            t: successMessage,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: successMessage.length }],
          }),
        ]);
      } catch (rollbackError) {
        this.logger.error('Error rolling back recharge:', rollbackError);
      }

      throw error;
    } finally {
    }
  }

  protected async handleProcessingError(
    tokenEvent: TokenSentEvent,
    error: any,
  ): Promise<void> {
    this.logger.error(`Failed to process token recharge:`, {
      transactionId: tokenEvent.transaction_id,
      amount: tokenEvent.amount,
      senderId: tokenEvent.sender_id,
      error: error.message,
    });
  }
}
