import { InjectRepository } from '@nestjs/typeorm';
import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Repository } from 'typeorm';
import { WelcomeMessage } from 'src/bot/models/welcomeMessage.entity';

@Command('welcomemsginfo')
export class WelcomeMsgInfoCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(WelcomeMessage)
    private welcomeMessageRepository: Repository<WelcomeMessage>,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);
    const welcomeMessage = await this.welcomeMessageRepository.findOne({
      where: { botId: process.env.BOT_ID },
    });
    if (!welcomeMessage) {
      return await messageChannel?.reply({
        t: `welcomeMessage not updated yet`,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: `welcomeMessage not updated yet`.length,
          },
        ],
      });
    }
    return await messageChannel?.reply({
      t: welcomeMessage.content,
      mk: [
        {
          type: EMarkdownType.PRE,
          s: 0,
          e: welcomeMessage.content.length,
        },
      ],
    });
  }
}
