import {
  EButtonMessageStyle,
  EMarkdownType,
  EMessageComponentType,
  MezonClient,
} from 'mezon-sdk';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { User } from 'src/bot/models/user.entity';
import {
  MEZON_EMBED_FOOTER,
  EmbebButtonType,
  EmbedProps,
  FuncType,
} from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Daugia } from 'src/bot/models/daugia.entity';
import { ConfigService } from '@nestjs/config';
import { getRandomColor } from 'src/bot/utils/helps';

@Injectable()
export class DauGiaStartService {
  private client: MezonClient;
  private lixiCanceled: Map<string, boolean> = new Map();

  private lixiClickQueue: Map<
    string,
    { user_id: string; username: string; timestamp: number }[]
  > = new Map();
  private lixiProcessingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lixiCompleted: Map<string, boolean> = new Map();
  private lixiProcessing: Map<string, boolean> = new Map();

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Daugia) private daugiaRepository: Repository<Daugia>,
    private clientService: MezonClientService,
    private configService: ConfigService,
  ) {
    this.client = this.clientService.getClient();
  }

  async handleThamGia(
    data,
    authId,
    msgId,
    clanId,
    mode,
    isPublic,
    color,
    nameProduct,
    startPrice,
    minPrice,
  ) {
    console.log('data', data);

    if (data.user_id === authId) {
      return;
    }
    const feeAuction: number = 5000;

    const channel = await this.client.channels.fetch(data.channel_id);

    const findUser = await this.userRepository.findOne({
      where: { user_id: data.user_id },
    });

    console.log('asadsa', findUser);

    const bot = await this.userRepository.findOne({
      where: { user_id: this.configService.get('BOT_ID') },
    });

    if (!bot) {
      return;
    }

    if (!findUser || findUser.amount < feeAuction) {
      const content = `[Tham Đấu giá không hợp lệ]
               -[User]: phải có channel
               -[$]: Số tiền của bạn không đủ để tham gia`;

      return await channel.sendEphemeral(data.user_id, {
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

    findUser.amount -= feeAuction;
    bot.amount += feeAuction;

    await this.userRepository.save([findUser, bot]);

    try {
      const embed: EmbedProps[] = [
        {
          color: getRandomColor(),
          title: `[Thamgiadaugia]`,
          fields: [
            {
              name: 'Tên Sản Phẩm Đấu Giá',
              value: '',
              inputs: {
                id: `userjoinauction-${data.user_id}-name-ip`,
                type: EMessageComponentType.INPUT,
                component: {
                  id: `userjoinauction-${data.user_id}-name-plhder`,
                  placeholder: 'Ex. Write something',
                  required: true,
                  textarea: true,
                  defaultValue: nameProduct,
                  disabled: true,
                },
              },
            },
            {
              name: 'Giá:',
              value: '',
              inputs: {
                id: `userjoinauction-${data.user_id}-price-ip`,
                type: EMessageComponentType.INPUT,
                component: {
                  id: `userjoinauction-${data.user_id}-price-plhder`,
                  required: true,
                  type: 'number',
                  defaultValue: 10000,
                },
              },
            },
          ],
          timestamp: new Date().toISOString(),
          footer: MEZON_EMBED_FOOTER,
        },
      ];

      const components = [
        {
          components: [
            {
              id: `userjoinauction_CANCEL_${data.user_id}_${data.channel_id}_${getRandomColor()}_${data.message_id}`,
              type: EMessageComponentType.BUTTON,
              component: {
                label: `Cancel`,
                style: EButtonMessageStyle.SECONDARY,
              },
            },
            {
              id: `userjoinauction_SUBMITCREATE_${data.user_id}_${data.channel_id}_${getRandomColor()}_${data.message_id}`,
              type: EMessageComponentType.BUTTON,
              component: {
                label: `Send`,
                style: EButtonMessageStyle.SUCCESS,
              },
            },
          ],
        },
      ];

      await channel.sendEphemeral(data.user_id, {
        embed,
        components,
      });
    } catch (error) {}

    return;
  }

  async handleJoinAuction(data: any) {
    try {
      const [
        _,
        typeButtonRes,
        authId,
        clanId,
        mode,
        isPublic,
        color,
        message_id,
        nameProduct,
        startPrice,
        minPrice,
      ] = data.button_id.split('_');

      if (!data.user_id) return;
      switch (typeButtonRes) {
        case EmbebButtonType.THAMGIA:
          await this.handleThamGia(
            data,
            authId,
            message_id,
            clanId,
            mode,
            isPublic,
            color,
            nameProduct,
            startPrice,
            minPrice,
          );
          break;
        // case EmbebButtonType.LIXI:
        //   break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleJoinAuction:', error);
    }
  }

  async handleUserJoinAuction(data: any) {
    try {
      const channel = await this.client.channels.fetch(data.channel_id);

      const [
        _,
        typeButtonRes,
        authId,
        clanId,
        mode,
        isPublic,
        color,
        message_id,
        nameProduct,
        startPrice,
        minPrice,
      ] = data.button_id.split('_');

      console.log('case', typeButtonRes);

      if (!data.user_id) return;
      switch (typeButtonRes) {
        case EmbebButtonType.SUBMITCREATE:
          await this.handleUserSubmit(
            data,
            authId,
            message_id,
            clanId,
            mode,
            isPublic,
            color,
            nameProduct,
            startPrice,
            minPrice,
          );
          break;
        case EmbebButtonType.CANCEL:
          this.handleCancel(
            data,
            authId,
            message_id,
            clanId,
            mode,
            isPublic,
            color,
            nameProduct,
            startPrice,
            minPrice,
          );
          break;
        default:
          break;
      }

      console.log(data);
    } catch (error) {
      console.error('Error in handleUserJoinAuction:', error);
    }
  }

  async handleCancel(
    data,
    authId,
    message_id,
    clanId,
    mode,
    isPublic,
    color,
    nameProduct,
    startPrice,
    minPrice,
  ) {
    try {
      const channel = await this.client.channels.fetch(data.channel_id);

      const context = 'bạn đã hủy tham gia đấu giá';
      const aa = await channel.sendEphemeral(data.user_id, {
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });

      console.log('dsadsvada', aa);
    } catch (error) {}
  }

  async handleUserSubmit(
    data,
    authId,
    message_id,
    clanId,
    mode,
    isPublic,
    color,
    nameProduct,
    startPrice,
    minPrice,
  ) {
    try {
    } catch (error) {}
  }
}
