import { EMarkdownType, MezonClient } from 'mezon-sdk';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { EmbebButtonType, FuncType } from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Daugia } from 'src/bot/models/daugia.entity';

@Injectable()
export class MylistService {
  private client: MezonClient;
  constructor(
    @InjectRepository(Daugia) private daugiaRepository: Repository<Daugia>,
    private clientService: MezonClientService,
  ) {
    this.client = this.clientService.getClient();
  }

  async handleUpdateDaugia(data: any) {
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
        daugia_id,
      ] = data.button_id.split('_');

      if (!data.user_id) return;

      switch (typeButtonRes) {
        case EmbebButtonType.SUBMITCREATE:
          await this.handleSubmitSave(
            data,
            authId,
            clanId,
            mode,
            isPublic,
            color,
            message_id,
            daugia_id,
          );
          break;
        case EmbebButtonType.CANCEL:
          await this.handleSubmitCancel(
            data,
            authId,
            clanId,
            mode,
            isPublic,
            color,
            message_id,
            daugia_id,
          );
          break;
        default:
          break;
      }
    } catch (error) {}
  }

  async handleSubmitSave(
    data,
    authId,
    clanId,
    mode,
    isPublic,
    color,
    message_id,
    daugia_id,
  ) {
    try {
      const channel = await this.client.channels.fetch(data.channel_id);
      const message = await channel.messages.fetch(data.message_id);
      let parsedExtraData;
      try {
        parsedExtraData = JSON.parse(data.extra_data);
      } catch (error) {
        const content = 'Dữ liệu biểu mẫu không hợp lệ';
        return await message.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      }

      const description =
        parsedExtraData[`updatedaugia-${message_id}-description-ip`];
      const name = parsedExtraData[`updatedaugia-${message_id}-name-ip`];
      const image = parsedExtraData[`updatedaugia-${message_id}-image-ip`];
      const priceStr =
        parsedExtraData[`updatedaugia-${message_id}-startingprice-ip`];
      const timeStr = parsedExtraData[`updatedaugia-${message_id}-time-ip`];
      const minPriceStr =
        parsedExtraData[`updatedaugia-${message_id}-minPrice-ip`];
      const stepPriceStr =
        parsedExtraData[`updatedaugia-${message_id}-priceStep-ip`];

      const price = priceStr ? Number(priceStr) : undefined;
      const time = timeStr ? Number(timeStr) : undefined;
      const minPrice = minPriceStr ? Number(minPriceStr) : undefined;
      const stepPrice = stepPriceStr ? Number(stepPriceStr) : undefined;

      const dauGia = await this.daugiaRepository.findOne({
        where: {
          daugia_id: Number(daugia_id),
        },
      });

      if (!dauGia) {
        const errorContent = `Không tìm thấy phiên đấu giá với ID ${daugia_id}`;
        return await message.update({
          t: errorContent,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: errorContent.length }],
        });
      }

      const validationErrors: string[] = [];

      if (name) {
        if (!name.trim() || name.length < 3 || name.length > 100) {
          validationErrors.push(
            '[Product Auction Name]: phải có value từ 3-100 ký tự',
          );
        }
      }

      if (description) {
        if (!description.trim() || description.length < 10) {
          validationErrors.push(
            '[Description]: phải có value tối thiểu 10 ký tự',
          );
        }
      }

      if (image) {
        if (!image.trim()) {
          validationErrors.push(
            '[Product Auction (image link)]: phải là link ảnh hợp lệ (png, jpg, jpeg, gif, webp)',
          );
        }
      }

      if (price) {
        if (isNaN(price) || price < 1000 || price > 1000000000) {
          validationErrors.push(
            '[Starting Price]: phải là số từ 1,000 đến 1,000,000,000',
          );
        }
      }

      if (minPrice) {
        const currentPrice = price !== undefined ? price : dauGia.startPrice;
        if (isNaN(minPrice) || minPrice < 1000 || minPrice >= currentPrice) {
          validationErrors.push(
            '[Minimum Price]: phải là số từ 1,000, nhỏ hơn [Starting Price] và là bội số của 1,000',
          );
        }
      }

      if (stepPrice) {
        const currentPrice = price !== undefined ? price : dauGia.startPrice;
        if (
          isNaN(stepPrice) ||
          stepPrice <= 0 ||
          stepPrice % 1000 !== 0 ||
          stepPrice > currentPrice / 2
        ) {
          validationErrors.push(
            '[Price Step]: phải là bội số của 1,000 và không vượt quá 50% giá khởi điểm',
          );
        }
      }

      if (time) {
        if (isNaN(time) || time <= 0 || time % 5 !== 0 || time > 1440) {
          validationErrors.push(
            '[Time (minutes)]: phải là bội số của 5 và không vượt quá 1440 phút (24 giờ)',
          );
        }
      }

      if (validationErrors.length > 0) {
        const content = `[Update phiên đấu giá không hợp lệ]\n${validationErrors.join('\n')}`;
        return await message.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      }

      dauGia.name = name !== undefined ? name : dauGia.name;
      dauGia.description =
        description !== undefined ? description : dauGia.description;
      dauGia.image = image !== undefined ? image : dauGia.image;
      dauGia.startPrice = price !== undefined ? price : dauGia.startPrice;
      dauGia.minPrice = minPrice !== undefined ? minPrice : dauGia.minPrice;
      dauGia.time = time !== undefined ? time : dauGia.time;
      dauGia.stepPrice = stepPrice !== undefined ? stepPrice : dauGia.stepPrice;

      await this.daugiaRepository.save(dauGia);

      const successContent = `Phiên đấu giá sản phẩm "${dauGia.name}" đã được cập nhật`;
      await message.update({
        t: successContent,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: successContent.length }],
      });
    } catch (error) {
      console.error('Error updating auction:', error);
      const channel = await this.client.channels.fetch(data.channel_id);
      const message = await channel.messages.fetch(data.message_id);
      const errorContent = 'Đã xảy ra lỗi khi cập nhật đấu giá';
      await message.update({
        t: errorContent,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: errorContent.length }],
      });
    }
  }

  async handleSubmitCancel(
    data,
    authId,
    clanId,
    mode,
    isPublic,
    color,
    message_id,
    daugia_id,
  ) {
    try {
      if (!data.user_id || data.user_id !== authId) return;
      const channel = await this.client.channels.fetch(data.channel_id);
      const message = await channel.messages.fetch(data.message_id);

      const cancelContent = 'Đã hủy cập nhật đấu giá';
      await message.update({
        t: cancelContent,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: cancelContent.length }],
      });
    } catch (error) {
      console.error('Error cancelling auction update:', error);
    }
  }
}
