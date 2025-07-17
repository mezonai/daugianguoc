import { InjectRepository } from '@nestjs/typeorm';
import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Repository } from 'typeorm';
import { WelcomeMessage } from 'src/bot/models/welcomeMessage.entity';

@Command('welcomemsg')
export class WelcomeMsgCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(WelcomeMessage)
    private welcomeMessageRepository: Repository<WelcomeMessage>,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    if (message.sender_id !== '1827994776956309504') return;
    const messageChannel = await this.getChannelMessage(message);
    let messageContent =
      'welcome message content is not given! \n Example: *welcomemsg welcome message content \n [username]: to get the user name \n [clanname]: to get clan name';
    if (!args[0] || !message.content.t) {
      return await messageChannel?.reply({
        t: messageContent,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: messageContent.length,
          },
        ],
      });
    }

    const fullMessage = message.content.t;
    const commandPrefix = '*welcomemsg ';
    const contentWithoutCommand = fullMessage.startsWith(commandPrefix)
      ? fullMessage.slice(commandPrefix.length).trim()
      : fullMessage.slice('*'.length).trim();
    const dataMezonBotMessage = {
      botId: process.env.BOT_ID,
      content: contentWithoutCommand,
    };
    await this.welcomeMessageRepository.upsert(dataMezonBotMessage, ['botId']);
    return await messageChannel?.reply({
      t: contentWithoutCommand,
      mk: [
        {
          type: EMarkdownType.PRE,
          s: 0,
          e: contentWithoutCommand.length,
        },
      ],
    });
  }
}
