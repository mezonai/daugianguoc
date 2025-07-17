import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../models/user.entity';
interface SharedUserProperties {
  user_id: string;
  username: string;
  avatar: string;
  display_name?: string;
  message_id?: string;
  clan_avatar?: string;
  clan_nick?: string;
}
@Injectable()
export class ExtendersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async addDBUser(
    user: SharedUserProperties,
    invitor: string,
    clan_id: string,
  ) {
    if (user.user_id === '1767478432163172999') return; // ignored anonymous user
    const findUser = await this.userRepository.findOne({
      where: { user_id: user.user_id },
    });

    if (findUser) {
      findUser.user_id = user.user_id!;
      findUser.username = user.username!;
      findUser.avatar = user.clan_avatar! || user.avatar!;
      findUser.bot = false;
      findUser.display_name = user.display_name ?? '';
      findUser.clan_nick = user.clan_nick ? user.clan_nick : findUser.clan_nick;
      findUser.last_message_id = user.message_id!;
      findUser.last_message_time = Date.now();
      findUser.deactive = findUser.deactive;
      findUser.botPing = findUser.botPing;
      if (invitor) {
        const currentWhitelist = findUser.whitelist || {};
        const clanWhitelist = new Set(currentWhitelist[clan_id] || []);
        clanWhitelist.add(invitor);
        currentWhitelist[clan_id] = Array.from(clanWhitelist);
        findUser.whitelist = currentWhitelist;

        const currentInvitor = findUser.invitor || {};
        currentInvitor[clan_id] = invitor;
        findUser.invitor = currentInvitor;
      }
      await this.userRepository.save(findUser);
      return;
    }

    const komuUser = {
      user_id: user.user_id,
      username: user.username,
      avatar: user.clan_avatar || user.avatar,
      bot: false,
      display_name: user.display_name ?? '',
      clan_nick: user.clan_nick ?? '',
      last_message_id: user.message_id,
      last_message_time: Date.now(),
      scores_quiz: 0,
      deactive: false,
      botPing: false,
      createdAt: Date.now(),
      whitelist: invitor ? { [clan_id]: [invitor] } : {},
      invitor: invitor ? { [clan_id]: invitor } : {},
    };

    await this.userRepository.insert(komuUser);
  }
}
