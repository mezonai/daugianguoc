import { InjectRepository } from '@nestjs/typeorm';
import {
  EButtonMessageStyle,
  ChannelMessage,
  EMarkdownType,
  EMessageComponentType,
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
import { min } from 'rxjs';

@Command('daugia')
export class DauGiaCommand extends CommandMessage {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    clientService: MezonClientService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    // const now = new Date();
    // now.setSeconds(0, 0);

    // const toISOStringLocal = (date: Date) => {
    //   const offset = date.getTimezoneOffset();
    //   const local = new Date(date.getTime() - offset * 60 * 1000);
    //   return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    // };

    // const minValue = toISOStringLocal(now);

    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `[daugia]`,
        fields: [
          {
            name: 'Tên Sản Phẩm Đấu Giá',
            value: '',
            inputs: {
              id: `daugia-${message.message_id}-name-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daugia-${message.message_id}-name-plhder`,
                placeholder: 'Ex. Write something',
                required: true,
                textarea: true,
              },
            },
          },
          {
            name: 'Sản Phẩm Đấu Giá (link ảnh):',
            value: '',
            inputs: {
              id: `daugia-${message.message_id}-image-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daugia-${message.message_id}-image-plhder`,
                required: true,
                type: 'string',
              },
            },
          },
          {
            name: 'Description:',
            value: '',
            inputs: {
              id: `daugia-${message.message_id}-description-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daugia-${message.message_id}-description-plhder`,
                placeholder: 'Ex. Description Product',
                required: true,
                textarea: true,
              },
            },
          },
          // {
          //   name: 'Ngày & Giờ Đấu Giá:',
          //   value: '',
          //   inputs: {
          //     id: `daugia-${message.message_id}-datetime-ip`,
          //     type: EMessageComponentType.INPUT,
          //     component: {
          //       id: `daugia-${message.message_id}-datetime-plhder`,
          //       required: true,
          //       type: 'datetime-local',
          //       min: minValue,
          //       defaultValue: minValue,
          //     },
          //   },
          // },
          {
            name: 'Giá khởi điểm:',
            value: '',
            inputs: {
              id: `daugia-${message.message_id}-startingprice-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daugia-${message.message_id}-startingprice-plhder`,
                required: true,
                defaultValue: 100000,
                type: 'number',
              },
            },
          },
          {
            name: 'Giá Tối Thiểu:',
            value: '',
            inputs: {
              id: `daugia-${message.message_id}-minPrice-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daugia-${message.message_id}-minPrice-plhder`,
                required: true,
                defaultValue: 10000,
                type: 'number',
              },
            },
          },
          {
            name: 'Thời gian phiên đấu giá (phút):',
            value: '',
            inputs: {
              id: `daugia-${message.message_id}-time-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daugia-${message.message_id}-time-plhder`,
                required: true,
                defaultValue: 15,
                type: 'number',
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
            id: `daugia_CANCEL_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Cancel`,
              style: EButtonMessageStyle.SECONDARY,
            },
          },
          {
            id: `daugia_SUBMITCREATE_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Create`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];

    await messageChannel?.reply({
      embed,
      components,
    });
  }
}
