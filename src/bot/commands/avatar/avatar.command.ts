import { InjectRepository } from '@nestjs/typeorm';
import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { EmbedProps } from 'src/bot/constants/configs';
import { EUserError } from 'src/bot/constants/error';
import { User } from 'src/bot/models/user.entity';
import { getRandomColor } from 'src/bot/utils/helps';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Repository } from 'typeorm';

@Command('avatar')
export class AvatarCommand extends CommandMessage {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    clientService: MezonClientService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);
    if (message.clan_id === '1779484504377790464') {
      return;
    }
    let messageContent: string;
    let userQuery: string | undefined;

    if (Array.isArray(message.references) && message.references.length) {
      userQuery = message.references[0].message_sender_username;
    } else {
      if (
        Array.isArray(message.mentions) &&
        message.mentions.length &&
        args[0]?.startsWith('@')
      ) {
        const findUser = await this.userRepository.findOne({
          where: {
            user_id: message.mentions[0].user_id,
          },
        });
        userQuery = findUser?.username;
      } else {
        userQuery = args.length ? args[0] : message.username;
      }

      //check fist arg
      if (args[0]) {
        const findUserArg = await this.userRepository
          .createQueryBuilder('user')
          .where(
            '(user.clan_nick = :query OR user.username = :query OR user.user_id = :query)',
            { query: args[0] },
          )
          .orderBy(
            'CASE WHEN user.clan_nick = :query THEN 1 WHEN user.username = :query THEN 2 ELSE 3 END',
          )
          .getOne();
        if (findUserArg) {
          userQuery = findUserArg.username;
        }
      }
    }
    const findUser = await this.userRepository.findOne({
      where: { username: userQuery },
    });

    if (!findUser)
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
    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `${findUser.clan_nick || findUser.username}'s avatar`,
        author: {
          name: findUser.clan_nick || findUser.username,
          icon_url: findUser.avatar,
          url: findUser.avatar,
        },
        image: {
          url: findUser.avatar,
          width: '400px',
          height: '400px',
        },
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Powered by Mezon',
          icon_url:
            'https://cdn.mezon.vn/1837043892743049216/1840654271217930240/1827994776956309500/857_0246x0w.webp',
        },
      },
    ];
    return messageChannel?.reply({ embed });
  }
}
