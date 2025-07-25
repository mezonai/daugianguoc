import { EMarkdownType, MezonClient } from 'mezon-sdk';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { EmbebButtonType, FuncType } from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Daugia } from 'src/bot/models/daugia.entity';

@Injectable()
export class DauGiaService {
  private client: MezonClient;
  constructor(
    @InjectRepository(Daugia) private daugiaRepository: Repository<Daugia>,
    private clientService: MezonClientService,
  ) {
    this.client = this.clientService.getClient();
  }

  async handleSubmitCreate(data, authId, msgId, clanId, mode, isPublic, color) {
    if (data.user_id !== authId) {
      return;
    }

    const channel = await this.client.channels.fetch(data.channel_id);
    const message = await channel.messages.fetch(data.message_id);
    let parsedExtraData;

    try {
      parsedExtraData = JSON.parse(data.extra_data);
    } catch (error) {
      const content = 'Invalid form data provided';
      return await message.update({
        t: content,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
      });
    }

    const description = parsedExtraData[`daugia-${msgId}-description-ip`] || '';
    const name = parsedExtraData[`daugia-${msgId}-name-ip`] || '';
    const image = parsedExtraData[`daugia-${msgId}-image-ip`] || '';
    const priceStr = parsedExtraData[`daugia-${msgId}-startingprice-ip`] || '0';
    const timeStr = parsedExtraData[`daugia-${msgId}-time-ip`] || '5';
    const minPriceStr = parsedExtraData[`daugia-${msgId}-minPrice-ip`] || '0';
    const stepPriceStr = parsedExtraData[`daugia-${msgId}-priceStep-ip`] || '0';

    const price = Number(priceStr);
    const time = Number(timeStr);
    const minPrice = Number(minPriceStr);
    const stepPrice = Number(stepPriceStr);

    const isInvalid =
      !name.trim() ||
      name.length < 3 ||
      name.length > 100 ||
      !description.trim() ||
      description.length < 10 ||
      !image.trim() ||
      // !image.match(/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i) ||
      isNaN(price) ||
      isNaN(minPrice) ||
      isNaN(stepPrice) ||
      isNaN(time) ||
      price < 1000 ||
      minPrice < 1000 ||
      minPrice >= price ||
      price > 1000000000 ||
      time <= 0 ||
      time % 5 !== 0 ||
      time > 1440 ||
      stepPrice <= 0 ||
      stepPrice % 1000 !== 0 ||
      stepPrice > price / 2;

    if (isInvalid) {
      const content = `[Đấu giá không hợp lệ]
             -[Product Auction Name]: phải có value từ 3-100 ký tự
             -[Description]: phải có value tối thiểu 10 ký tự
             -[Product Auction (image link)]: phải là link ảnh 
             -[Product Price]: phải là số từ 1,000 đến 1,000,000,000 
             -[Giá tối thiểu]: phải là số từ 1,000, nhỏ hơn [Product Price] và là bội số của 1,000
             -[Price Step]: phải là bội số của 1,000 và không vượt quá 50% giá khởi điểm
             -[Time (minutes)]: phải là bội số của 5 và không vượt quá 1440 phút (24 giờ)`;

      return await message.update({
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

    const user = this.daugiaRepository.create({
      name,
      description,
      image,
      createby: authId,
      clan_id: clanId,
      startPrice: price,
      time,
      minPrice,
      stepPrice,
    });
    await this.daugiaRepository.save(user);
    const content = 'Tạo thành công buổi đấu giá ';

    try {
      await message.update({
        t: content,
        mk: [
          {
            type: EMarkdownType.PRE,
            s: 0,
            e: content.length,
          },
        ],
      });
    } catch (error) {
      console.error('Error in handleSubmitCreate:', error);
      const errorMessage =
        'Có lỗi xảy ra khi tạo phiên đấu giá. Vui lòng thử lại.';
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

    return;
  }

  async handleSubmitCancel(
    data,
    authId,
    msgId,
    clan_id,
    mode,
    is_public,
    color,
  ) {
    try {
      if (!data.user_id || data.user_id !== authId) return;
      const channel = await this.client.channels.fetch(data.channel_id);
      const message = await channel.messages.fetch(data.message_id);
      const context = 'Bạn đã hủy tạo phiên đấu giá';
      await message.update({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    } catch (error) {}
  }

  async handleSelectDauGia(data: any) {
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
      ] = data.button_id.split('_');

      if (!data.user_id) return;

      switch (typeButtonRes) {
        case EmbebButtonType.SUBMITCREATE:
          await this.handleSubmitCreate(
            data,
            authId,
            message_id,
            clanId,
            mode,
            isPublic,
            color,
          );
          break;
        case EmbebButtonType.CANCEL:
          await this.handleSubmitCancel(
            data,
            authId,
            message_id,
            clanId,
            mode,
            isPublic,
            color,
          );
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleSelectLixi:', error);
    }
  }
}
