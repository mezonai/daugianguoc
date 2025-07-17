import { OnEvent } from '@nestjs/event-emitter';
import { EMarkdownType, Events, MezonClient } from 'mezon-sdk';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddClanUserEvent } from 'mezon-sdk/dist/cjs/rtapi/realtime';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { WelcomeMessage } from '../models/welcomeMessage.entity';

@Injectable()
export class WelcomeMessageHandler {
  private client: MezonClient;
  constructor(
    @InjectRepository(WelcomeMessage)
    private WelcomeMsgRepository: Repository<WelcomeMessage>,
    private clientService: MezonClientService,
  ) {
    this.client = this.clientService.getClient();
  }
  @OnEvent(Events.AddClanUser)
  async handleGuildMemberAdd(addClanUser: AddClanUserEvent) {
    const clan = await this.client.clans.get(addClanUser.clan_id);

    const welcomeMessage = await this.WelcomeMsgRepository.findOne({
      where: { botId: process.env.BOT_ID },
    });
    if (!welcomeMessage || !clan) {
      return;
    }
    const user = await clan.users.fetch(addClanUser.user?.user_id || '');
    const clanname = clan.name.toUpperCase();
    const username = user.username;
    const describe = welcomeMessage.content
      .replace('[username]', username)
      .replace('[clanname]', clanname);
    const content = `${describe}`;
    return await user.sendDM({
      t: content,
      mk: [{ type: EMarkdownType.PRE, s: 0, e: content.length }],
    });
  }
}
