import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { DynamicCommandService } from 'src/bot/services/dynamic.service';
import * as QRCode from 'qrcode';
import { EmbedProps, MEZON_EMBED_FOOTER } from 'src/bot/constants/configs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EUserError } from 'src/bot/constants/error';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { User } from 'src/bot/models/user.entity';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { getRandomColor } from 'src/bot/utils/helps';

@Command('qr')
export class QRCodeCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);
    let userQuery: string = '';
    if (message.clan_id === '1779484504377790464') {
      return;
    }
    if (Array.isArray(message.references) && message.references.length) {
      userQuery = message.references[0].message_sender_username!;
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
        userQuery = findUser?.username!;
      } else {
        userQuery = args.length ? args[0] : message.username!;
      }

      //check fist arg
      if (args[0]) {
        const findUserArg = await this.userRepository
          .createQueryBuilder('user')
          .where(
            '(user.clan_nick = :query OR user.username = :query OR user.user_id = :query)',
            { query: args[0] },
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
    const sendTokenData = {
      sender_id: message.sender_id,
      receiver_id: findUser.user_id,
      receiver_name: findUser.username,
    };
    const qrCodeDataUrl = await QRCode.toDataURL(
      JSON.stringify(sendTokenData),
      {
        errorCorrectionLevel: 'L',
      },
    );
    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `QR send token to ${findUser.username}`,
        image: {
          url: qrCodeDataUrl,
          width: '300px',
          height: '300px',
        },
        timestamp: new Date().toISOString(),
        footer: MEZON_EMBED_FOOTER,
      },
    ];
    return await messageChannel?.reply({ embed });
  }
}
