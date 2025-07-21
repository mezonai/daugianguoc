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
import { BillAuction } from 'src/bot/models/billauction.entity';
import { ConfigService } from '@nestjs/config';

@Command('start')
export class DauGiaStartCommand extends CommandMessage {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Daugia)
    private dauGiaRepository: Repository<Daugia>,
    @InjectRepository(BillAuction)
    private billAuctionRepository: Repository<BillAuction>,
    clientService: MezonClientService,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    const bot = await this.userRepository.findOne({
      where: { user_id: this.configService.get('BOT_ID') },
    });

    if (!bot) return;

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
      const bills = await this.billAuctionRepository.find({
        where: {
          auction: { daugia_id: daugia.daugia_id },
          isDelete: false,
        },
        relations: ['userAuction', 'auction'],
      });

      if (bills.length === 0) {
        const content = 'Phiên đấu giá đã kết thúc!';
        await messsageReply.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });

        const context = 'Không có người tham gia đấu giá.';
        await channel.send({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });

        return;
      }

      const blockMountCount: Record<number, number> = {};
      for (const bill of bills) {
        blockMountCount[bill.blockMount] =
          (blockMountCount[bill.blockMount] || 0) + 1;
      }

      const uniqueBlockMounts = Object.entries(blockMountCount)
        .filter(([_, count]) => count === 1)
        .map(([blockMount]) => Number(blockMount));

      if (uniqueBlockMounts.length === 0) {
        const context = 'Không có mức giá nào là duy nhất.';
        await channel.send({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }

      const minUniqueBlockMount = Math.min(...uniqueBlockMounts);
      const winningBill = bills.find(
        (b) => b.blockMount === minUniqueBlockMount,
      );

      if (winningBill) {
        daugia.buyer = winningBill.userAuction;
        daugia.purchase = winningBill.blockMount;

        await this.dauGiaRepository.save(daugia);
        bot.amount = Number(bot.amount) + Number(winningBill.blockMount);

        await this.userRepository.save(bot);

        const losingBills = bills.filter(
          (b) => b.blockMount !== minUniqueBlockMount,
        );

        const refundMap: Map<string, number> = new Map();
        for (const bill of losingBills) {
          const userId = bill.userAuction.user_id;
          const amount = refundMap.get(userId) || 0;
          refundMap.set(userId, amount + bill.blockMount);
        }
        for (const [userId, refundAmount] of refundMap.entries()) {
          const user = await this.userRepository.findOne({
            where: { user_id: userId },
          });
          if (user) {
            user.amount = Number(user.amount) + Number(refundAmount);
            await this.userRepository.save(user);
          }
        }

        const content = `Xin chúc mừng ${winningBill?.userAuction.username} đã đấu giá thành công với giá ${winningBill?.blockMount.toLocaleString('vi-VN')}đ`;

        await channel.send({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
      }

      await this.billAuctionRepository
        .createQueryBuilder()
        .update()
        .set({ isDelete: true })
        .where('auction_id = :auctionId', { auctionId: daugia.daugia_id })
        .andWhere('isDelete = false')
        .execute();

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
      1 * 60 * 1000,
    );

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
  }
}
