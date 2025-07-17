// import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
// import { Command } from 'src/bot/base/commandRegister.decorator';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DataSource, Repository } from 'typeorm';
// import { CommandMessage } from 'src/bot/base/command.abstract';
// import { User } from 'src/bot/models/user.entity';
// import { MezonClientService } from 'src/mezon/services/mezon-client.service';
// import { BlockRut } from 'src/bot/models/blockrut.entity';
// import { FuncType } from 'src/bot/constants/configs';

// @Command('ban')
// export class BanCommand extends CommandMessage {
//   constructor(
//     clientService: MezonClientService,
//     @InjectRepository(User) private userRepository: Repository<User>,
//   ) {
//     super(clientService);
//   }

//   async execute(args: string[], message: ChannelMessage) {
//     if (message.sender_id !== '1827994776956309504') return;
//     const messageChannel = await this.getChannelMessage(message);
//     const content = args.join(' ');
//     const usernameMatch = content.match(/\[username\]:\s*([^\[\]]+)/);
//     console.log('usernameMatch: ', usernameMatch);
//     const typeMatch = content.match(/\[type\]:\s*(\w+)/);
//     const timeMatch = content.match(/\[time\]:\s*(\d+)([smhd])/);
//     const noteMatch = content.match(/\[note\]:\s*(.+)/);

//     if (!typeMatch || !timeMatch || !usernameMatch) {
//       const content = `[Ban]
//         - [username]: tên người bị ban
//         - [type]: ban chức năng (rut, slots, lixi, sicbo, transaction, all)
//         - [time]: thời gian ban (đơn vị: s, m, h, d)
//         - [note]: lý do ban
//         Ex: *ban [username]: a.nguyenvan, b.phamquoc [type]: rut [time]: 5m [note]: phá hoại`;

//       return await messageChannel?.reply({
//         t: content,
//         mk: [
//           {
//             type: EMarkdownType.PRE,
//             s: 0,
//             e: content.length,
//           },
//         ],
//       });
//     }
//     const usernameRaw = usernameMatch[1].trim();
//     const usernames = usernameRaw.split(',').map((u) => u.trim());
//     const type = typeMatch[1];
//     const timeValue = parseInt(timeMatch[1], 10);
//     const unit = timeMatch[2];
//     const note = noteMatch ? noteMatch[1] : '';

//     const now = Math.floor(Date.now() / 1000);
//     let duration = 0;

//     switch (unit) {
//       case 's':
//         duration = timeValue;
//         break;
//       case 'm':
//         duration = timeValue * 60;
//         break;
//       case 'h':
//         duration = timeValue * 3600;
//         break;
//       case 'd':
//         duration = timeValue * 86400;
//         break;
//       default:
//         const content = `[Ban]
//         - [username]: tên người bị ban
//         - [type]: ban chức năng (rut, slots, lixi, sicbo, transaction, all)
//         - [time]: thời gian ban (đơn vị: s, m, h, d)
//         - [note]: lý do ban
//         Ex: *ban [username]: a.nguyenvan, b.phamquoc [type]: rut [time]: 5m [note]: phá hoại`;

//         return await messageChannel?.reply({
//           t: content,
//           mk: [
//             {
//               type: EMarkdownType.PRE,
//               s: 0,
//               e: content.length,
//             },
//           ],
//         });
//     }
//     let funcType = '';
//     switch (type) {
//       case FuncType.RUT:
//         funcType = FuncType.RUT;
//         break;
//       case FuncType.LIXI:
//         funcType = FuncType.LIXI;
//         break;
//       case FuncType.SICBO:
//         funcType = FuncType.SICBO;
//         break;
//       case FuncType.SLOTS:
//         funcType = FuncType.SLOTS;
//         break;
//       case FuncType.TRANSACTION:
//         funcType = FuncType.TRANSACTION;
//         break;
//       case FuncType.ALL:
//         funcType = FuncType.ALL;
//         break;
//       default:
//         const content = `[Ban]
//         - [username]: tên người bị ban
//         - [type]: ban chức năng (rut, slots, lixi, sicbo, transaction, all)
//         - [time]: thời gian ban (đơn vị: s, m, h, d)
//         - [note]: lý do ban
//         Ex: *ban [username]: a.nguyenvan, b.phamquoc [type]: rut [time]: 5m [note]: phá hoại`;

//         return await messageChannel?.reply({
//           t: content,
//           mk: [
//             {
//               type: EMarkdownType.PRE,
//               s: 0,
//               e: content.length,
//             },
//           ],
//         });
//     }

//     const expiresAt = now + duration;
//     let userban: string[] = [];
//     for (const username of usernames) {
//       const findUser = await this.userRepository.findOne({
//         where: {
//           username: username,
//         },
//       });

//       if (!findUser) {
//         continue;
//       }
//       const bans = Array.isArray(findUser.ban) ? findUser.ban : [];

//       const idx = bans.findIndex((b) => b.type === funcType);

//       if (idx >= 0) {
//         bans[idx].unBanTime = expiresAt;
//         bans[idx].note = note;
//       } else {
//         bans.push({
//           type: funcType,
//           unBanTime: expiresAt,
//           note: note,
//         });
//       }
//       findUser.ban = bans;
//       await this.userRepository.save(findUser);
//       userban.push(username);
//     }
//     let contentMsg = '';
//     if (userban.length > 0) {
//       contentMsg = `${userban.join(', ')} đã bị ban ${funcType}`;
//       return await messageChannel?.reply({
//         t: contentMsg,
//         mk: [
//           {
//             type: EMarkdownType.PRE,
//             s: 0,
//             e: contentMsg.length,
//           },
//         ],
//       });
//     }
//   }
// }
