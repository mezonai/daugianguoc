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
import { EmbebButtonType, FuncType } from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { EUserError } from '../../constants/error';
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
    const datetimeStr = parsedExtraData[`daugia-${msgId}-datetime-ip`] || '';
    const priceStr = parsedExtraData[`daugia-${msgId}-startingprice-ip`] || '0';
    const timeStr = parsedExtraData[`daugia-${msgId}-startingprice-ip`] || '5';

    const datetime = new Date(datetimeStr);

    const price = Number(priceStr);
    const time = Number(timeStr);

    if (
      !name.trim() ||
      !description.trim() ||
      !image.trim() ||
      !datetimeStr.trim() ||
      isNaN(price) ||
      price <= 1000 ||
      price % 1000 !== 0 ||
      time % 5 !== 0
    ) {
      const content = `[Đấu giá không hợp lệ]
             -[Tên sản phẩm]: phải có value
             -[Mô tả]: phải có value
             -[Ảnh]: link ảnh
             -[Giá khởi điểm]: phải là số > 1000 và là số nguyên chẵn
             -[Thời gian phiên đấu giá]: phải là bội số của 5
            `;

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
    });
    await this.daugiaRepository.save(user);
    const content =
      'Tạo thành công buổi đấu giá sẽ bắt đâu vào' +
      datetime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

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
      const errorMessage = 'Có lỗi xảy ra khi tạo lixi. Vui lòng thử lại.';
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
        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleSelectLixi:', error);
    }
  }
}
