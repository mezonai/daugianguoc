import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { User } from 'src/bot/models/user.entity';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { EUserError } from 'src/bot/constants/error';

@Command('whitelist')
export class WhiteListAddCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);
    const bot = await this.userRepository.findOne({
      where: { user_id: process.env.BOT_ID || '' },
    });
    if (!bot)
      return await messageChannel?.reply({
        t: EUserError.INVALID_USER,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: EUserError.INVALID_USER.length,
          },
        ],
      });
    if (bot?.invitor[message.clan_id || ''] !== message.username) {
      const content = `[Role] - You have no permission!`;
      return await messageChannel?.reply({
        t: content,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: content.length,
          },
        ],
      });
    }
    const [actionRaw, ...usersRaw] = args
      .join(' ')
      .split('+')
      .map((s) => s.trim());
    const actionMatch = actionRaw.match(/^\[(.+?)\]\s*(.+)?$/);

    let action = '';
    let usernames: string[] = [];

    if (actionMatch) {
      action = actionMatch[1];
      const firstUser = actionMatch[2];
      usernames = [firstUser, ...usersRaw].filter(Boolean);
    }
    if (
      usernames.length === 0 ||
      !action ||
      (action !== 'add' && action !== 'remove')
    ) {
      const content = `Cú pháp không hợp lệ. Vui lòng dùng: [add] user1 + user2`;
      return await messageChannel?.reply({
        t: content,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: content.length,
          },
        ],
      });
    }

    if (action !== 'add' && action === 'remove') {
    }

    if (action === 'add') {
      const currentWhitelist = bot.whitelist || {};
      const clanWhitelist = new Set(
        currentWhitelist[message.clan_id || ''] || [],
      );
      for (const username of usernames) {
        clanWhitelist.add(username);
      }
      currentWhitelist[message.clan_id || ''] = Array.from(clanWhitelist);
      bot.whitelist = currentWhitelist;
      await this.userRepository.save(bot);
      const content = '✅ Đã thêm vào whitelist:\n' + usernames.join(', ');
      return await messageChannel?.reply({
        t: content,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: content.length,
          },
        ],
      });
    }

    if (action === 'remove') {
      const currentWhitelist = bot.whitelist || {};
      const clanWhitelist = new Set(
        currentWhitelist[message.clan_id || ''] || [],
      );
      for (const username of usernames) {
        clanWhitelist.delete(username);
      }
      currentWhitelist[message.clan_id || ''] = Array.from(clanWhitelist);

      await this.userRepository.save(bot);
      const content = '✅ Đã xóa khỏi whitelist:\n' + usernames.join(', ');
      return await messageChannel?.reply({
        t: content,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: content.length,
          },
        ],
      });
    }
  }
}
