// import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
// import { Command } from 'src/bot/base/commandRegister.decorator';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { CommandMessage } from 'src/bot/base/command.abstract';
// import { User } from 'src/bot/models/user.entity';
// import { MezonClientService } from 'src/mezon/services/mezon-client.service';
// import { FuncType } from 'src/bot/constants/configs';

// @Command('unban')
// export class UnbanCommand extends CommandMessage {
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
//     const typeMatch = content.match(/\[type\]:\s*(\w+)/);

//     if (!typeMatch || !usernameMatch) {
//       const content = `[Unban]
//         - [username]: tên người bị ban
//         - [type]: ban chức năng (rut, slots, lixi, sicbo, transaction, all)
//         Ex: *unban [username]: a.nguyenvan, b.phamquoc [type]: rut`;

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

//     const now = Math.floor(Date.now() / 1000);

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
//         const content = `[unban]
//         - [username]: tên người bị ban
//         - [type]: ban chức năng (rut, slots, lixi, sicbo, transaction, all)
//         Ex: *unban [username]: a.nguyenvan, b.phamquoc [type]: rut`;

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

//     let unbanned: string[] = [];
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
//       if (funcType === FuncType.ALL) {
//         findUser.ban = [];
//         await this.userRepository.save(findUser);
//         unbanned.push(username);
//         continue;
//       }
//       const updatedBans = bans.filter((b) => b.type !== funcType);
//       if (updatedBans.length === bans.length) {
//         continue;
//       }

//       findUser.ban = updatedBans;
//       await this.userRepository.save(findUser);
//       unbanned.push(username);
//     }

//     console.log('unbanned: ', unbanned);
//     let contentMsg = '';
//     if (unbanned.length > 0) {
//       contentMsg = `${unbanned.join(', ')} đã được unban ${funcType}`;
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
