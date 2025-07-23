import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { EUserError } from 'src/bot/constants/error';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { User } from 'src/bot/models/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Command('kttk')
export class AccBalanceCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    try {
      const user = await this.userRepository.findOne({
        where: { user_id: message.sender_id },
      });
      if (!user) {
        const context = 'User not found';
        return await messageChannel?.reply({
          t: context,

          mk: [
            {
              type: EMarkdownType.PRE,
              s: 0,
              e: context.length,
            },
          ],
        });
      }

      const successMessage = `💸Số dư của bạn là ${Math.floor(user.amount).toLocaleString('vi-VN')}đ`;

      return await messageChannel?.reply({
        t: successMessage,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: successMessage.length,
          },
        ],
      });
    } catch (error) {
      console.error('Error in AccBalanceCommand:', error);

      const errorMessage =
        'Có lỗi xảy ra khi kiểm tra số dư. Vui lòng thử lại sau.';
      return await messageChannel?.reply({
        t: errorMessage,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: errorMessage.length,
          },
        ],
      });
    }
  }
}
