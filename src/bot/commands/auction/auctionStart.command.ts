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
  private isStart: boolean = false;
  private static activeAuctions: Map<
    string,
    { channel_id: string; lastNotify: number }
  > = new Map();
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

    if (message.sender_id === (this.configService.get('ADMIN_ID') as string)) {
      if (args[0] === 'block') {
        this.isStart = true;
        const context = 'Đã khóa hệ thống đấu giá';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      } else if (args[0] === 'unlock') {
        this.isStart = false;
        const context = 'Hệ thống đã được mở khóa đấu giá';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      } else if (args[0] === 'sch' && args[1] && args[2] && args[3]) {
        const dateTimeStr = args.slice(2).join(' ');
        const scheduledTime = new Date(dateTimeStr);

        const daugia = await this.dauGiaRepository.findOne({
          where: {
            createby: {
              user_id: message.sender_id,
            },
            daugia_id: Number(args[1]),
            isDelete: false,
          },
          relations: ['createby'],
        });

        if (!daugia) {
          const context =
            'Bạn không có phiên đấu giá nào ! vui lòng xem lại ID phiên đấu giá để lên lịch ';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }

        if (isNaN(scheduledTime.getTime())) {
          const context =
            'Định dạng thời gian không hợp lệ. Sử dụng: $start schedule YYYY-MM-DD HH:MM';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }
        const now = new Date();
        const nowInVietnam = now.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        const timeUntilTarget =
          scheduledTime.getTime() - new Date(nowInVietnam).getTime();
        const thirtyMinutesInMs =
          Number(this.configService.get('TIME_NOTIFICATION')) * 60 * 1000;

        if (timeUntilTarget <= 0) {
          const context = 'Thời gian đã qua, không thể lên lịch';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }

        if (timeUntilTarget < thirtyMinutesInMs) {
          const context =
            'Phải lên lịch trước ít nhất ' +
            Number(this.configService.get('TIME_NOTIFICATION')) +
            ' phút để có thể thông báo trước';
          return await messageChannel?.reply({
            t: context,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
          });
        }

        await this.scheduleAuctionAt(scheduledTime, message, daugia);

        const context = `Đã lên lịch phiên đấu giá sản phẩm ${daugia.name} vào lúc ${scheduledTime.toLocaleString('vi-VN')}`;
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }
    }

    if (this.isStart) {
      const context = 'Hệ thống đang bảo trì, vui lòng thử lại sau';
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    }
    if (args[0]) {
      const daugia = await this.dauGiaRepository.findOne({
        where: {
          createby: {
            user_id: message.sender_id,
          },
          daugia_id: Number(args[0]),
          isDelete: false,
        },
        relations: ['createby'],
      });

      if (!daugia) {
        const context =
          'Bạn không có phiên đấu giá nào ! vui lòng xem lại tên sản phẩm ';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }
      return this.startAuctionSession(daugia, message);
    }

    const daugiaList = await this.dauGiaRepository.find({
      where: {
        createby: {
          user_id: message.sender_id,
        },
        isDelete: false,
      },
      relations: ['createby'],
    });

    if (daugiaList.length === 0) {
      const context = 'Bạn không có phiên đấu giá nào !';
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    }
    if (daugiaList.length === 1) {
      return this.startAuctionSession(daugiaList[0], message);
    }

    if (daugiaList.length > 1) {
      const dauGiaNames = daugiaList
        .map(
          (dg, i) =>
            `ID: ${dg.daugia_id} - ${dg.name} - startPrice: ${dg.startPrice.toLocaleString('vi-VN')}đ - minPrice: ${dg.minPrice.toLocaleString('vi-VN')}đ - stepPrice: ${dg.stepPrice.toLocaleString('vi-VN')}đ - time: ${dg.time} phút`,
        )
        .join('\n');
      const context = `Bạn có nhiều phiên đấu giá đang hoạt động:\n${dauGiaNames} \n vui lòng dùng command $start [ID] để bắt đầu phiên đấu giá`;
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    } else {
      const context = 'Bạn không có phiên đấu giá nào !';
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    }
  }

  async scheduleAuctionAt(
    targetTime: Date,
    message: ChannelMessage,
    daugia: Daugia,
  ) {
    const now = new Date();
    const timeUntilTarget = targetTime.getTime() - now.getTime();
    const thirtyMinutesInMs =
      Number(this.configService.get('TIME_NOTIFICATION')) * 60 * 1000;

    if (timeUntilTarget > thirtyMinutesInMs) {
      const notificationTime = timeUntilTarget - thirtyMinutesInMs;
      const notificationName = `notification-auction-${message.sender_id}-${Date.now()}`;

      const notificationTimeout = setTimeout(async () => {
        await this.sendUpcomingAuctionNotification(
          message,
          targetTime,
          daugia.name,
        );
        this.schedulerRegistry.deleteTimeout(notificationName);
      }, notificationTime);

      this.schedulerRegistry.addTimeout(notificationName, notificationTimeout);
    }

    const scheduleName = `scheduled-auction-${message.sender_id}-${Date.now()}`;
    const timeout = setTimeout(async () => {
      if (daugia) {
        await this.startAuctionSession(daugia, message);
      }

      this.schedulerRegistry.deleteTimeout(scheduleName);
    }, timeUntilTarget);

    this.schedulerRegistry.addTimeout(scheduleName, timeout);
  }

  async startAuctionSession(daugia: Daugia, message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    const startTime = new Date();
    const endTime = new Date(
      startTime.getTime() + (daugia.time || 15) * 60 * 1000,
    );

    const formatTime = (date: Date) => {
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
    };

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
            name: 'Product Auction Name: ' + daugia?.name,
            value: '',
          },
          {
            name: 'Description: ' + daugia?.description,
            value: '',
          },
          {
            name:
              'Product Price: ' +
              daugia?.startPrice?.toLocaleString('vi-VN') +
              'đ',
            value: '',
          },
          {
            name:
              'Minimum Price: ' +
              daugia?.minPrice?.toLocaleString('vi-VN') +
              'đ',
            value: '',
          },
          {
            name:
              'Step Price: ' + daugia?.stepPrice?.toLocaleString('vi-VN') + 'đ',
            value: '',
          },
          {
            name:
              'Time (minutes): ' +
              daugia?.time?.toString() +
              ' phút (' +
              formatTime(startTime) +
              ' - ' +
              formatTime(endTime) +
              ')',
            value: '',
          },
          {
            name:
              'Note : Số tiền đấu giá cho mỗi lần đấu giá là riêng biệt , phí bắt đầu đấu giá cho mỗi lần là ' +
              Number(this.configService.get('PHI_THAM_GIA')).toLocaleString(
                'vi-VN',
              ) +
              'đ và không hoàn lại khi người đấu giá sai quy định (hãy kiểm tra xem tài khoản của bạn trước khi vào phiên đấu giá) ',
            value: '',
          },
          {
            name: 'Người chiến thắng : Là người đưa ra mức giá thấp nhất và duy nhất trong phiên đấu giá',
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
            id: `joinauction_THAMGIA_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}_${daugia?.name}_${daugia.startPrice}_${daugia.minPrice}_${daugia.stepPrice}`,
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
    await this.sendMessageNotification(message, daugia);
    if (!messages) {
      return;
    }

    const checkNoBidder = async (message: ChannelMessage) => {
      const channel = await this.client.channels.fetch(message?.channel_id);
      const messages = channel.messages.values();
      const context = Array.from(messages).map((msg) => ({
        author: msg.sender_id,
        content: msg.content?.t,
        channel_id: message?.channel_id,
        sender_id: msg.sender_id,
      }));

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
              name: 'Product Auction Name: ' + daugia?.name,
              value: '',
            },
            {
              name: 'Description: ' + daugia?.description,
              value: '',
            },
            {
              name:
                'Product Price: ' +
                daugia?.startPrice?.toLocaleString('vi-VN') +
                'đ',
              value: '',
            },
            {
              name:
                'Minimum Price: ' +
                daugia?.minPrice?.toLocaleString('vi-VN') +
                'đ',
              value: '',
            },
            {
              name:
                'Step Price: ' +
                daugia?.stepPrice?.toLocaleString('vi-VN') +
                'đ',
              value: '',
            },
            {
              name:
                'Time (minutes): ' +
                daugia?.time?.toString() +
                ' phút (' +
                formatTime(startTime) +
                ' - ' +
                formatTime(endTime) +
                ')',
              value: '',
            },
            {
              name:
                'Note : Số tiền đấu giá cho mỗi lần đấu giá là riêng biệt , phí bắt đầu đấu giá cho mỗi lần là ' +
                Number(this.configService.get('PHI_THAM_GIA')).toLocaleString(
                  'vi-VN',
                ) +
                'đ và không hoàn lại khi người đấu giá sai quy định (hãy kiểm tra xem tài khoản của bạn trước khi vào phiên đấu giá) ',
              value: '',
            },
            {
              name: 'Người chiến thắng : Là người đưa ra mức giá thấp nhất và duy nhất trong phiên đấu giá',
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
              id: `joinauction_THAMGIA_${message.sender_id}_${message.clan_id}_${message.mode}_${message.is_public}_${getRandomColor()}_${message.message_id}_${daugia?.name}_${daugia.startPrice}_${daugia.minPrice}_${daugia.stepPrice}`,
              type: EMessageComponentType.BUTTON,
              component: {
                label: `Tham Gia Đấu Giá`,
                style: EButtonMessageStyle.SUCCESS,
              },
            },
          ],
        },
      ];

      const botId = this.configService.get('BOT_ID');

      if (context.length > 0 && context[context.length - 1].author !== botId) {
        const sendMessage = await channel.send({ embed, components });
        DauGiaStartCommand.activeAuctions.set(sendMessage.message_id, {
          channel_id: message.channel_id,
          lastNotify: Date.now(),
        });
      }
      return;
    };
    const intervalName = `auction-check-nobidder-${message.message_id}-${daugia.daugia_id}`;

    const interval = setInterval(() => {
      void checkNoBidder(message);
    }, 10000);

    this.schedulerRegistry.addInterval(intervalName, interval);

    const timeoutName = `auction-timeout-${message.sender_id}-${daugia.daugia_id}-${Date.now()}`;
    const channel = await this.client.channels.fetch(messages?.channel_id);
    const messsageReply = await channel.messages.fetch(messages?.message_id);

    const callback = async (messsageReply: any) => {
      this.schedulerRegistry.deleteInterval(intervalName);
      this.schedulerRegistry.deleteTimeout(timeoutName);
      clearInterval(interval);
      const bot = await this.userRepository.findOne({
        where: { user_id: this.configService.get('BOT_ID') },
      });

      if (!bot) return;
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
        this.updateMessageAuction(message);

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
        const content = 'Phiên đấu giá đã kết thúc!';
        await messsageReply.update({
          t: content,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
        });
        const context = 'Buổi đấu giá không có mức giá nào là duy nhất.';
        await channel.send({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
        this.updateMessageAuction(message);
        return;
      }

      const minUniqueBlockMount = Math.min(...uniqueBlockMounts);
      const winningBill = bills.find(
        (b) => b.blockMount === minUniqueBlockMount,
      );

      if (winningBill) {
        daugia.buyer = winningBill.userAuction;
        daugia.purchase = winningBill.blockMount;
        daugia.isDelete = true;
        await this.dauGiaRepository.save(daugia);

        const buyer = await this.userRepository.findOne({
          where: { user_id: daugia.createby.user_id },
        });

        if (buyer) {
          buyer.amount = Number(buyer.amount) + Number(winningBill.blockMount);
          await this.userRepository.save(buyer);
        }

        const losingBills = bills.filter(
          (b) => b.blockMount !== minUniqueBlockMount,
        );

        const refundMap: Map<string, number> = new Map();
        for (const bill of losingBills) {
          const userId = bill.userAuction.user_id;
          const amount = refundMap.get(userId) || 0;
          refundMap.set(userId, amount + bill.blockMount);
          await this.billAuctionRepository.save(bill);
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

        const content = `Xin chúc mừng ${winningBill?.userAuction.username} đã đấu giá thành công sản phẩm ${winningBill.auction.name}  với giá ${winningBill?.blockMount.toLocaleString('vi-VN')}đ`;

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

      this.updateMessageAuction(message);
    };

    const timeout = setTimeout(
      async () => {
        await callback(messsageReply);
      },
      (daugia.time || 15) * 60 * 1000,
    );

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
  }

  async updateMessageAuction(message: ChannelMessage) {
    const channel = await this.client.channels.fetch(message.channel_id);
    const allAuctions = Array.from(DauGiaStartCommand.activeAuctions.entries());

    for (const [message_id, auctionInfo] of allAuctions) {
      try {
        const channel = await this.client.channels.fetch(message.channel_id);
        const endMsg = await channel.messages.fetch(message_id);

        if (endMsg) {
          const content = 'Phiên đấu giá đã kết thúc!';
          await endMsg.update({
            t: content,
            mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
          });
          DauGiaStartCommand.activeAuctions.delete(message_id);
        }
      } catch (e) {}
    }
  }

  async sendMessageNotification(message: ChannelMessage, daugia: Daugia) {
    const channel = await this.client.channels.fetch(message.channel_id);

    const messageContent = '@here Phiên đấu giá ' + daugia.name + ' đã bắt đầu';

    const replyMessage = {
      t: messageContent,
    };
    const mentions = [{ user_id: '1', s: 0, e: 5 }];
    await channel.send(replyMessage, mentions, undefined, true);
  }

  async sendUpcomingAuctionNotification(
    message: ChannelMessage,
    scheduledTime: Date,
    productName: string,
  ) {
    const channel = await this.client.channels.fetch(message.channel_id);

    const formattedTime = scheduledTime.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const messageContent =
      '@here Thông báo: Phiên đấu giá sản phẩm ' +
      productName +
      ' sẽ diễn ra sau ' +
      Number(this.configService.get('TIME_NOTIFICATION')) +
      ' phút nữa. Vui lòng đảm bảo mọi công tác chuẩn bị (token) để tham gia đấu giá . Thời gian bắt đầu: ' +
      formattedTime;

    const replyMessage = {
      t: messageContent,
    };
    const mentions = [{ user_id: '1', s: 0, e: 5 }];
    await channel.send(replyMessage, mentions, undefined, true);
  }
}
