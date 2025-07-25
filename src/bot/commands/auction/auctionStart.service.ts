import {
  EButtonMessageStyle,
  EMarkdownType,
  EMessageComponentType,
  MezonClient,
} from 'mezon-sdk';

import { DataSource, Repository } from 'typeorm';
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
import { BillAuction } from 'src/bot/models/billauction.entity';

interface JoinType {
  user_id: string;
  username: string;
  price: number;
  numberAuction: number;
}

@Injectable()
export class DauGiaStartService {
  private client: MezonClient;
  private ClickQueue: Map<string, JoinType> = new Map();

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Daugia) private daugiaRepository: Repository<Daugia>,
    @InjectRepository(BillAuction)
    private billAuctionRepository: Repository<BillAuction>,
    private clientService: MezonClientService,
    private configService: ConfigService,
    private dataSource: DataSource,
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
    stepPrice,
  ) {
    if (data.user_id === authId) {
      return;
    }

    const feeAuction: number =
      Number(this.configService.get('PHI_THAM_GIA')) || 5000;

    const channel = await this.client.channels.fetch(data.channel_id);

    const auctioneer = await channel.clan.users.fetch(data.user_id);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const findUser = await queryRunner.manager.findOne(User, {
        where: { user_id: data.user_id },
      });

      if (!findUser) {
        return;
      }

      if (!findUser || findUser.amount < feeAuction) {
        const content = `[Tham Đấu giá không hợp lệ]
                 -[User]: phải có trong channel
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

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

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
                  defaultValue: minPrice,
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
              id: `userjoinauction_CANCEL_${data.user_id}_${data.channel_id}_${getRandomColor()}_${data.message_id}_${minPrice}_${startPrice}`,
              type: EMessageComponentType.BUTTON,
              component: {
                label: `Cancel`,
                style: EButtonMessageStyle.SECONDARY,
              },
            },
            {
              id: `userjoinauction_SUBMITCREATE_${data.user_id}_${data.channel_id}_${getRandomColor()}_${data.message_id}_${minPrice}_${startPrice}_${nameProduct}_${stepPrice}`,
              type: EMessageComponentType.BUTTON,
              component: {
                label: `Send`,
                style: EButtonMessageStyle.SUCCESS,
              },
            },
          ],
        },
      ];

      await auctioneer.sendDM({
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
        stepPrice,
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
            stepPrice,
          );
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleJoinAuction:', error);
    }
  }

  async handleUserJoinAuction(data: any) {
    try {
      const [
        _,
        typeButtonRes,
        authId,
        channel_id,
        color,
        message_id,
        minPrice,
        startPrice,
        nameProduct,
        stepPrice,
      ] = data.button_id.split('_');

      if (!data.user_id) return;
      switch (typeButtonRes) {
        case EmbebButtonType.SUBMITCREATE:
          await this.handleUserSubmit(
            data,
            authId,
            channel_id,
            color,
            message_id,
            minPrice,
            startPrice,
            nameProduct,
            stepPrice,
          );
          break;
        case EmbebButtonType.CANCEL:
          this.handleCancel(data, authId, channel_id, color, message_id);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleUserJoinAuction:', error);
    }
  }

  async handleCancel(data, authId, channel_id, color, message_id) {
    try {
      if (!data.user_id || data.user_id !== authId) return;

      const channel = await this.client.channels.fetch(data.channel_id);
      const message = await channel.messages.fetch(data.message_id);

      const context = 'Bạn đã hủy tham gia đấu giá';
      await message.update({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    } catch (error) {
      console.log(error);
    }
  }

  async handleUserSubmit(
    data,
    authId,
    channel_id,
    color,
    message_id,
    minPrice,
    startPrice,
    nameProduct,
    stepPrice,
  ) {
    try {
      const feeAuction: number =
        Number(this.configService.get('PHI_THAM_GIA')) || 5000;
      const channel = await this.client.channels.fetch(channel_id);
      const channelDM = await this.client.channels.fetch(data.channel_id);
      const message = await channelDM.messages.fetch(data.message_id);
      const user = await this.userRepository.findOne({
        where: { user_id: data.user_id },
      });
      const queryRunner = this.dataSource.createQueryRunner();

      const product = await this.daugiaRepository.findOne({
        where: { name: nameProduct, isDelete: false },
      });

      if (!product) {
        const content = 'Product available';
        return await message.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      }

      if (!user) {
        const content = 'User not available';
        return await message.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      }
      let parsedExtraData;

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        parsedExtraData = JSON.parse(data.extra_data);
        const priceStr =
          parsedExtraData[`userjoinauction-${data.user_id}-price-ip`] || '0';
        const price = Number(priceStr);
        const totalPrice = Number(price) + Number(feeAuction);

        if (
          Number(user.amount) < totalPrice ||
          price > Number(startPrice) ||
          price < Number(minPrice) ||
          price % Number(stepPrice) !== 0
        ) {
          let errorMessage = '[Thông báo đấu giá của bạn đang sai quy định]';

          if (Number(user.amount) < Number(price) + Number(feeAuction)) {
            errorMessage +=
              '\n- Số dư của bạn hiện tại của bạn là ' +
              Number(user.amount).toLocaleString('vi-VN') +
              'đ bé hơn ' +
              'giá của bạn tham gia đấu giá + phí tham gia đấu giá ' +
              Number(totalPrice).toLocaleString('vi-VN') +
              'đ';
          }

          if (price > Number(startPrice)) {
            errorMessage +=
              '\n- Giá của bạn đấu giá ' +
              Number(price).toLocaleString('vi-VN') +
              'đ  đã lớn hơn giá của sản phẩm ' +
              Number(startPrice).toLocaleString('vi-VN') +
              'đ';
          }

          if (price < Number(minPrice)) {
            errorMessage +=
              '\n- Giá của bạn đấu giá ' +
              Number(price).toLocaleString('vi-VN') +
              'đ  đã nhỏ hơn giá của sản phẩm ' +
              Number(minPrice).toLocaleString('vi-VN') +
              'đ';
          }

          if (price % Number(stepPrice) !== 0) {
            errorMessage +=
              '\n- Giá của bạn đấu giá ' +
              Number(price).toLocaleString('vi-VN') +
              'đ  đã không phải là bội số của bước giá ' +
              Number(stepPrice).toLocaleString('vi-VN') +
              'đ';
          }

          return await message.update({
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

        user.amount = Number(user.amount) - (price + feeAuction);

        const newBill = await queryRunner.manager.create(BillAuction, {
          auction: { daugia_id: product.daugia_id } as Daugia,
          userAuction: { user_id: data.user_id } as User,
          blockMount: price,
        });
        await queryRunner.manager.save(newBill);
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
        const context =
          'Bạn đã đấu giá sản phầm ' + nameProduct + ' với giá : ' + price;
        await message.update({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
        const content =
          user.username + ' đã tham gia đấu giá sản phẩm ' + nameProduct;
        return await channel.send({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        const content = 'Invalid form data provided';
        return await message.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.log(error);
    }
  }
}
