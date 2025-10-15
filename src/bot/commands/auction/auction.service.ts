import { EMarkdownType, MezonClient } from 'mezon-sdk';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { EmbebButtonType, FuncType } from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Daugia } from 'src/bot/models/daugia.entity';
import { parseVietnamLocalDateTimeString } from 'src/bot/utils/helps';

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
    const timeStr = parsedExtraData[`daugia-${msgId}-time-ip`] || '';
    const minPriceStr = parsedExtraData[`daugia-${msgId}-minPrice-ip`] || '0';
    const stepPriceStr = parsedExtraData[`daugia-${msgId}-priceStep-ip`] || '0';

    const price = Number(priceStr);
    const endTime = parseVietnamLocalDateTimeString(timeStr);
    const minPrice = Number(minPriceStr);
    const stepPrice = Number(stepPriceStr);

    const errors: string[] = [];
    if (!name.trim() || name.length < 3 || name.includes('_')) {
      errors.push(
        '-[Product Auction Name]: phải có value từ 3-100 ký tự và không chứa ký tự "_"',
      );
    }
    if (!description.trim() || description.length < 10) {
      errors.push('-[Description]: phải có value tối thiểu 10 ký tự');
    }
    if (!image.trim()) {
      errors.push('-[Product Auction (image link)]: phải là link ảnh');
    }

    if (
      isNaN(price) ||
      price < 1000 ||
      price > 1000000000 ||
      !Number.isInteger(price)
    ) {
      errors.push(
        '-[Product Price]: phải là số nguyên và từ 1.000 đến 1.000.000.000',
      );
    }
    if (
      isNaN(minPrice) ||
      minPrice < 1000 ||
      minPrice >= price ||
      (stepPrice > 0 && minPrice % stepPrice !== 0) ||
      !Number.isInteger(minPrice)
    ) {
      errors.push(
        `-[Minimum Price]: phải là số nguyên và từ 1.000, nhỏ hơn [Product Price] và là bội số của ${stepPrice}`,
      );
    }
    if (
      isNaN(stepPrice) ||
      stepPrice <= 0 ||
      !Number.isInteger(stepPrice) ||
      stepPrice > price / 2
    ) {
      errors.push(
        '-[Price Step]: phải là số nguyên lớn hơn 0  và không vượt quá 50% giá khởi điểm',
      );
    }

    if (!endTime || isNaN(endTime.getTime()) || endTime <= new Date()) {
      errors.push(
        '-[End Time]: phải là thời gian hợp lệ và phải lớn hơn thời gian hiện tại',
      );
    }

    if (errors.length > 0) {
      const content = `[Đấu giá không hợp lệ]\n` + errors.join('\n');
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
      endTime,
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
