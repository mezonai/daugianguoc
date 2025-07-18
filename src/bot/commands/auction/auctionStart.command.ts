import { InjectRepository } from '@nestjs/typeorm';
import {
  EButtonMessageStyle,
  ChannelMessage,
  EMarkdownType,
  EMessageComponentType,
  ChannelMessageAck,
} from 'mezon-sdk';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { User } from 'src/bot/models/user.entity';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Repository } from 'typeorm';
import {
  EmbedProps,
  FuncType,
  MEZON_EMBED_FOOTER,
} from '../../constants/configs';
import { getRandomColor } from 'src/bot/utils/helps';
import { Daugia } from 'src/bot/models/daugia.entity';
import { SchedulerRegistry } from '@nestjs/schedule';

@Command('start')
export class DauGiaStartCommand extends CommandMessage {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Daugia)
    private dauGiaRepository: Repository<Daugia>,
    clientService: MezonClientService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    const daugia = await this.dauGiaRepository.findOne({
      where: {
        createby: {
          user_id: message.sender_id,
        },
        isDelete: false,
      },
      relations: ['createby'],
    });

    if (!daugia) {
      const context = 'Bạn không có phiên đấu giá nào !';
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    }

    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `[Phiendaugia]`,
        image: {
          url: daugia?.image || '',
          width: '350px',
          height: '350px',
        },

        fields: [
          {
            name: 'Tên sản phẩm: ' + daugia?.name,
            value: '',
          },
          {
            name: 'Mô tả: ' + daugia?.description,
            value: '',
          },
          {
            name: 'Giá khởi điểm: ' + daugia?.startPrice?.toString() + ' đ',
            value: '',
          },
          {
            name:
              'Thời gian phiên đấu giá: ' + daugia?.time?.toString() + ' phút',
            value: '',
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
            id: `joinauction_THAMGIA_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}_${daugia?.name}_${daugia.startPrice}_${daugia.minPrice}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Tham Gia Đấu Giá`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];

    const messages = await messageChannel?.reply({
      embed,
      components,
    });
    if (!messages) {
      return;
    }

    const timeoutName = `auction-timeout-${message.sender_id}-${daugia.daugia_id}`;

    const channel = await this.client.channels.fetch(messages?.channel_id);
    const messsageReply = await channel.messages.fetch(messages?.message_id);

    const callback = async (messsageReply: any) => {
      const context = 'Phiên đấu giá đã kết thúc!';
      await messsageReply.update({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });

      this.schedulerRegistry.deleteTimeout(timeoutName);
    };

    const timeout = setTimeout(
      async () => {
        await callback(messsageReply);
      },
      daugia.time * 60 * 1000,
    );

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
  }
}
