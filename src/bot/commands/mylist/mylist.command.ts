import {
  ChannelMessage,
  EMarkdownType,
  EMessageComponentType,
  EButtonMessageStyle,
} from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { EUserError } from 'src/bot/constants/error';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { User } from 'src/bot/models/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Daugia } from 'src/bot/models/daugia.entity';
import { BillAuction } from 'src/bot/models/billauction.entity';
import { getRandomColor } from 'src/bot/utils/helps';
import { EmbedProps, MEZON_EMBED_FOOTER } from 'src/bot/constants/configs';

@Command('mylist')
export class MylistCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Daugia)
    private dauGiaRepository: Repository<Daugia>,
    @InjectRepository(BillAuction)
    private billAuctionRepository: Repository<BillAuction>,
    private configService: ConfigService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    try {
      if (args[0] === 'up') {
        if (!args[1]) {
          const context = 'Vui lòng nhập ID phiên đấu giá !';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }
        const dauGia = await this.dauGiaRepository.findOne({
          where: {
            daugia_id: Number(args[1]),
            createby: {
              user_id: message.sender_id,
            },
            isDelete: false,
          },
          relations: ['createby'],
        });

        if (!dauGia) {
          const context = 'Phiên đấu giá không tồn tại hoặc đã kết thúc !';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }
        return await this.handleUpdateDauGia(dauGia, message);
      }

      if (args[0] === 'del') {
        if (!args[1]) {
          const context = 'Vui lòng nhập ID phiên đấu giá !';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }
        const dauGia = await this.dauGiaRepository.findOne({
          where: {
            daugia_id: Number(args[1]),
            createby: {
              user_id: message.sender_id,
            },
            isDelete: false,
          },
        });
        if (!dauGia) {
          const context = 'Phiên đấu giá không tồn tại hoặc đã kết thúc !';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }
        dauGia.isDelete = true;
        await this.dauGiaRepository.save(dauGia);
        const context = `Đã xóa phiên đấu giá sản phẩm ${dauGia.name} thành công !`;
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }

      const listDaugia = await this.dauGiaRepository.find({
        where: {
          createby: {
            user_id: message.sender_id,
          },
          isDelete: false,
        },
        relations: ['createby'],
      });

      if (listDaugia.length === 0) {
        const context = 'Bạn không có phiên đấu giá nào !';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }

      const dauGiaNames = listDaugia
        .map(
          (dg, i) =>
            `ID: ${dg.daugia_id} - ${dg.name} - ${dg.isDelete ? 'Đã kết thúc' : 'Đang hoạt động'} - startPrice: ${dg.startPrice.toLocaleString('vi-VN')}đ - minPrice: ${dg.minPrice.toLocaleString('vi-VN')}đ - stepPrice: ${dg.stepPrice.toLocaleString('vi-VN')}đ - time: ${dg.time} phút`,
        )
        .join('\n');
      const context = `Danh sách phiên đấu giá của bạn:\n${dauGiaNames} \n Sử dụng command $mylist up [ID] để update phiên đấu giá hoặc $mylist del [ID] để xóa phiên đấu giá \n Lưu ý : bạn không thể xóa và update phiên đấu giá đã kết thúc , và đang xảy ra đấu giá`;
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    } catch (error) {
      console.error('Error in AccBalanceCommand:', error);
    }
  }

  async handleUpdateDauGia(daugia: Daugia, message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);
    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `[daugia]`,
        fields: [
          {
            name: 'Product Auction Name',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-name-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-name-plhder`,
                placeholder: 'Ex. Write something',
                required: true,
                textarea: true,
                defaultValue: daugia.name,
              },
            },
          },
          {
            name: 'Product Auction (image link):',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-image-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-image-plhder`,
                required: true,
                type: 'string',
                defaultValue: daugia.image,
              },
            },
          },
          {
            name: 'Description:',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-description-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-description-plhder`,
                placeholder: 'Ex. Description Product',
                required: true,
                textarea: true,
                defaultValue: daugia.description,
              },
            },
          },
          // {
          //   name: 'Ngày & Giờ Đấu Giá:',
          //   value: '',
          //   inputs: {
          //     id: `updatedaugia-${message.message_id}-datetime-ip`,
          //     type: EMessageComponentType.INPUT,
          //     component: {
          //       id: `updatedaugia-${message.message_id}-datetime-plhder`,
          //       required: true,
          //       type: 'datetime-local',
          //       min: minValue,
          //       defaultValue: minValue,
          //     },
          //   },
          // },
          {
            name: 'Starting Price:',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-startingprice-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-startingprice-plhder`,
                required: true,
                defaultValue: daugia.startPrice,
                type: 'number',
              },
            },
          },
          {
            name: 'Minimum Price:',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-minPrice-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-minPrice-plhder`,
                required: true,
                defaultValue: daugia.minPrice,
                type: 'number',
              },
            },
          },
          {
            name: 'Price Step:',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-priceStep-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-priceStep-plhder`,
                required: true,
                defaultValue: daugia.stepPrice,
                type: 'number',
              },
            },
          },
          {
            name: 'Time (minutes):',
            value: '',
            inputs: {
              id: `updatedaugia-${message.message_id}-time-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `updatedaugia-${message.message_id}-time-plhder`,
                required: true,
                defaultValue: daugia.time,
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
            id: `updatedaugia_CANCEL_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}_${daugia.daugia_id}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Cancel`,
              style: EButtonMessageStyle.SECONDARY,
            },
          },
          {
            id: `updatedaugia_SUBMITCREATE_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}_${daugia.daugia_id}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Save`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];

    return await messageChannel?.reply({
      embed,
      components,
    });
  }
}
