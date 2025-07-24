import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BillAuction } from 'src/bot/models/billauction.entity';
import { Daugia } from 'src/bot/models/daugia.entity';
import { ConfigService } from '@nestjs/config';

@Command('listbill')
export class ListBillCommand extends CommandMessage {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(BillAuction)
    private billAuctionRepository: Repository<BillAuction>,
    @InjectRepository(Daugia)
    private daugiaRepository: Repository<Daugia>,
    private configService: ConfigService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageChannel = await this.getChannelMessage(message);

    try {
      if (message.sender_id !== (this.configService.get('ADMIN_ID') as string))
        return;

      if (!args[0] || !Number(args[0])) {
        const context = 'Vui lòng nhập ID phiên đấu giá hợp lệ';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }

      const auctionId = Number(args[0]);

      const auction = await this.daugiaRepository.findOne({
        where: { daugia_id: auctionId },
        relations: ['buyer'],
      });

      if (!auction) {
        const context = 'Không tìm thấy phiên đấu giá với ID này';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }

      const bills = await this.billAuctionRepository.find({
        where: { auction: { daugia_id: auctionId } },
        relations: ['auction', 'userAuction'],
        order: { blockMount: 'ASC' },
      });

      if (!bills || bills.length === 0) {
        const context = 'Không có người tham gia đấu giá';
        return await messageChannel?.reply({
          t: context,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
        });
      }

      let billList = `Danh sách người tham gia đấu giá cho ${auction.name} (ID: ${auctionId}):\n\n`;

      bills.forEach((bill, index) => {
        billList += `${index + 1}. ${bill.userAuction.username}: ${bill.blockMount.toLocaleString('vi-VN')}đ\n`;
      });

      billList += `\nTổng số người tham gia: ${bills.length}`;
      if (auction.buyer) {
        billList += `\nNgười chiến thắng: ${auction.buyer.username} với giá ${auction.purchase?.toLocaleString('vi-VN')}đ`;
      } else if (auction.isDelete) {
        billList += `\nPhiên đấu giá đã kết thúc nhưng không có người chiến thắng`;
      } else {
        billList += `\nPhiên đấu giá đang diễn ra`;
      }

      return await messageChannel?.reply({
        t: billList,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: billList.length }],
      });
    } catch (error) {
      console.error('Error in ListBillCommand:', error);
      const context = 'Đã xảy ra lỗi khi lấy danh sách người đấu giá';
      return await messageChannel?.reply({
        t: context,
        mk: [{ type: EMarkdownType.PRE, s: 0, e: context.length }],
      });
    }
  }
}
