import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { EUserError } from 'src/bot/constants/error';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { User } from 'src/bot/models/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Command('chk')
export class ChkCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    try {
      if (message.sender_id !== (this.configService.get('ADMIN_ID') as string))
        return;
      if (args[0] === 'up') {
        if (args[1]) {
          const user = await this.userRepository.findOne({
            where: { user_id: args[1] },
          });
          const bot = await this.userRepository.findOne({
            where: { user_id: this.configService.get('BOT_ID') },
          });
          if (!user || !bot) return;

          if (args[2]) {
            if (!Number(args[2])) return;

            user.amount = Number(user.amount) + Number(args[2]);
            bot.amount = Number(bot.amount) - Number(args[2]);
            await this.userRepository.save([user, bot]);
            return await messageChannel?.reply({
              t: `Đã cập nhật số dư cho ${user.username} thành ${Math.floor(user.amount).toLocaleString('vi-VN')}đ`,
            });
          }
        }
      }
      if (args[0] === 'down') {
        if (args[1]) {
          const user = await this.userRepository.findOne({
            where: { user_id: args[1] },
          });
          const bot = await this.userRepository.findOne({
            where: { user_id: this.configService.get('BOT_ID') },
          });
          if (!user || !bot) return;

          if (args[2]) {
            if (!Number(args[2])) return;
            user.amount = Number(user.amount) - Number(args[2]);
            bot.amount = Number(bot.amount) + Number(args[2]);
            await this.userRepository.save([user, bot]);
            return await messageChannel?.reply({
              t: `Đã cập nhật số dư cho ${user.username} thành ${Math.floor(user.amount).toLocaleString('vi-VN')}đ`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in AccBalanceCommand:', error);
    }
  }
}
