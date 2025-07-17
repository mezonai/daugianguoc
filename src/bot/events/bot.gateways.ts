import { Injectable, Logger } from '@nestjs/common';
import {
  ApiMessageReaction,
  MezonClient,
  Events,
  TokenSentEvent,
  StreamingJoinedEvent,
  StreamingLeavedEvent,
  UserChannelRemoved,
  GiveCoffeeEvent,
  AddClanUserEvent,
} from 'mezon-sdk';

import {
  ChannelCreatedEvent,
  ChannelDeletedEvent,
  ChannelUpdatedEvent,
  UserChannelAddedEvent,
  UserClanRemovedEvent,
} from 'mezon-sdk';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoleAssignedEvent } from 'mezon-sdk/dist/cjs/rtapi/realtime';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { ExtendersService } from '../services/extenders.services';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';

@Injectable()
export class BotGateway {
  private readonly logger = new Logger(BotGateway.name);
  private client: MezonClient;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private clientService: MezonClientService,
    private extendersService: ExtendersService,
    private eventEmitter: EventEmitter2,
  ) {
    this.client = this.clientService.getClient();
  }

  initEvent() {
    this.client.onWebrtcSignalingFwd((data) => {
      console.log('handlewebrtcsignalingfwd', data);
    });

    this.client.onTokenSend((data: TokenSentEvent) => {
      this.eventEmitter.emit(Events.TokenSend, data);
    });

    this.client.onMessageButtonClicked((data) => {
      this.eventEmitter.emit(Events.MessageButtonClicked, data);
    });

    this.client.onStreamingJoinedEvent((data: StreamingJoinedEvent) => {
      this.eventEmitter.emit(Events.StreamingJoinedEvent, data);
    });

    this.client.onStreamingLeavedEvent((data: StreamingLeavedEvent) => {
      this.eventEmitter.emit(Events.StreamingLeavedEvent, data);
    });

    this.client.onClanEventCreated((data) => {
      this.eventEmitter.emit(Events.ClanEventCreated, data);
    });

    this.client.onMessageReaction((msg: ApiMessageReaction) => {
      this.eventEmitter.emit(Events.MessageReaction, msg);
    });

    this.client.onChannelCreated((channel: ChannelCreatedEvent) => {
      this.eventEmitter.emit(Events.ChannelCreated, channel);
    });

    this.client.onUserClanRemoved((user: UserClanRemovedEvent) => {
      this.eventEmitter.emit(Events.UserClanRemoved, user);
    });

    this.client.onRoleEvent(async (data) => {
      this.eventEmitter.emit(Events.RoleEvent, data);

      const botId = process.env.BOT_ID || '';
      const clanId = data.role?.clan_id;
      const roleId = data.role?.id;
      const maxLevelPermission = data.role?.max_level_permission || 0;

      const findHighestRole = (
        roles: { roleId: string; maxLevelPermission: number }[],
      ) => {
        if (!roles.length) return undefined;
        return roles.reduce((max, r) =>
          r.maxLevelPermission > max.maxLevelPermission ? r : max,
        ).roleId;
      };

      const bot = await this.userRepository.findOne({
        where: {
          user_id: botId,
        },
      });
      if (!bot || !clanId || !roleId) return;

      const currentRoleClan = bot.roleClan || {};
      const clanData = currentRoleClan[clanId] || {
        roles: [],
        highest: undefined,
      };

      if (data.user_add_ids.includes(botId)) {
        const exists = clanData.roles.some((r) => r.roleId === roleId);
        if (!exists) {
          clanData.roles.push({ roleId, maxLevelPermission });

          const currentHighest = clanData.roles.find(
            (r) => r.roleId === clanData.roleMax,
          );
          if (
            !currentHighest ||
            maxLevelPermission > currentHighest.maxLevelPermission
          ) {
            clanData.roleMax = roleId;
          }
        }

        currentRoleClan[clanId] = clanData;

        await this.userRepository.update(
          { user_id: botId },
          { roleClan: currentRoleClan },
        );
      }

      if (data.user_remove_ids.includes(botId)) {
        clanData.roles = clanData.roles.filter((r) => r.roleId !== roleId);

        if (clanData.roleMax === roleId) {
          clanData.roleMax = findHighestRole(clanData.roles);
        }

        currentRoleClan[clanId] = clanData;

        await this.userRepository.update(
          { user_id: botId },
          { roleClan: currentRoleClan },
        );
      }
    });

    this.client.onRoleAssign((data) => {
      this.eventEmitter.emit(Events.RoleAssign, data);
    });

    this.client.onUserChannelAdded((user: UserChannelAddedEvent) => {
      this.eventEmitter.emit(Events.UserChannelAdded, user);
    });

    this.client.onChannelDeleted((channel: ChannelDeletedEvent) => {
      this.eventEmitter.emit(Events.ChannelDeleted, channel);
    });

    this.client.onChannelUpdated((channel: ChannelUpdatedEvent) => {
      this.eventEmitter.emit(Events.ChannelUpdated, channel);
    });

    this.client.onUserChannelRemoved((msg: UserChannelRemoved) => {
      this.eventEmitter.emit(Events.UserChannelRemoved, msg);
    });

    this.client.onGiveCoffee((data: GiveCoffeeEvent) => {
      this.eventEmitter.emit(Events.GiveCoffee, data);
    });

    this.client.onAddClanUser(async (data: AddClanUserEvent) => {
      this.eventEmitter.emit(Events.AddClanUser, data);
      const user: any = {
        user_id: data.user.user_id,
        username: data.user.username,
        avatar: data.user.avatar,
        display_name: data.user.display_name,
      };
      await this.extendersService.addDBUser(user, data.invitor, data.clan_id);
    });

    this.client.onRoleAssign((data: RoleAssignedEvent) => {
      console.log(data);
    });

    this.client.onChannelMessage(async (message) => {
      ['attachments', 'mentions', 'references'].forEach((key) => {
        if (!Array.isArray(message[key])) message[key] = [];
      });
      try {
        if (message.sender_id && message.sender_id !== '0') {
          const user: any = {
            user_id: message.sender_id,
            username: message.username,
            avatar: message.avatar,
            display_name: message.display_name,
            message_id: message.message_id,
            clan_avatar: message.clan_avatar,
            clan_nick: message.clan_nick,
          };
          await this.extendersService.addDBUser(user, '', '');
        }
      } catch (e) {
        console.log(e);
      }
      this.eventEmitter.emit(Events.ChannelMessage, message);
    });
  }
}
