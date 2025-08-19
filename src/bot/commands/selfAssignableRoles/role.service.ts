import {
  EButtonMessageStyle,
  EMarkdownType,
  EMessageComponentType,
  MezonClient,
  MezonUpdateRoleBody,
} from 'mezon-sdk';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { User } from 'src/bot/models/user.entity';
import { EmbebButtonType, MEZON_EMBED_FOOTER } from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { getRandomColor, sleep } from 'src/bot/utils/helps';

@Injectable()
export class RoleService {
  private client: MezonClient;
  private blockEditedList: string[] = [];
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private clientService: MezonClientService,
  ) {
    this.client = this.clientService.getClient();
  }

  generateEmbedComponents(options, data?) {
    const embedCompoents = options.map((option, index) => {
      const userVoted = data?.[index];
      return {
        label: `${option.title.trim()} ${userVoted?.length ? `(${userVoted?.length})` : ''}`,
        value: JSON.stringify({ label: option.title, value: option.id }),
        style: EButtonMessageStyle.SUCCESS,
        name: option.id,
      };
    });
    return embedCompoents;
  }

  generateEmbedMessage(title: string, color: string, embedCompoents) {
    return [
      {
        color,
        title: `[ROLE] \n ${title}`,
        description: 'Select the option you want to add to the role.',
        fields: [
          {
            name: '',
            value: '',
            inputs: {
              id: `ROLE`,
              type: EMessageComponentType.RADIO,
              component: embedCompoents,
              max_option: 5,
            },
          },
        ],
        timestamp: new Date().toISOString(),
        footer: MEZON_EMBED_FOOTER,
      },
    ];
  }

  generateButtonComponents(data) {
    return [
      {
        components: [
          {
            id: `role_CANCEL_${data.sender_id}_${data.clan_id}_${data.mode}_${data.is_public}_${data?.color}_${data.clan_nick || data.username}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Cancel`,
              style: EButtonMessageStyle.SECONDARY,
            },
          },
          {
            id: `role_SAVE_${data.sender_id}_${data.clan_id}_${data.mode}_${data.is_public}_${data?.color}_${data.clan_nick || data.username}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Save`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];
  }

  generateButtonRoLeComponents(data, roles?) {
    const roleButtons = (roles || []).map((role, index) => ({
      id: `role_CONFIRM_${data.sender_id}_${data.clan_id}_${data.mode}_${data.is_public}_${data?.color}_${data.clan_nick || data.username}_${role.value}_${role.label}_${index}`,
      type: EMessageComponentType.BUTTON,
      component: {
        label: role.label,
        style: EButtonMessageStyle.PRIMARY,
      },
    }));
    return [
      {
        components: [...roleButtons],
      },
    ];
  }

  async handleSelectRole(data) {
    try {
      if (
        this.blockEditedList.includes(`${data.message_id}-${data.channel_id}`)
      )
        return;
      const [
        _,
        typeButtonRes,
        authId,
        clanId,
        mode,
        isPublic,
        color,
        authorName,
        role_id,
        role_title,
      ] = data.button_id.split('_');
      const channel = await this.client.channels.fetch(data.channel_id);
      const messsage = await channel.messages.fetch(data.message_id);
      const clan = await this.client.clans.fetch(clanId);

      const isPublicBoolean = isPublic === 'true' ? true : false;

      if (typeButtonRes === EmbebButtonType.CANCEL) {
        if (data.user_id !== authId) {
          return;
        }
        const textCancel = 'Cancel role successful!';
        const msgCancel = {
          t: textCancel,
          mk: [{ type: EMarkdownType.PRE, s: 0, e: textCancel.length }],
        };

        await messsage.update(msgCancel);
      }

      if (typeButtonRes === EmbebButtonType.SAVE) {
        if (data.user_id !== authId) {
          return;
        }
        const rawRoleList = JSON.parse(data.extra_data);
        const parsedRoles = rawRoleList.ROLE.map((item) => JSON.parse(item));
        const msgResults = {
          color: getRandomColor(),
          title: 'Self-Assignable Roles',
        };

        const dataGenerateButtonComponents = {
          sender_id: authId,
          clan_id: clanId,
          mode,
          is_public: isPublicBoolean,
          color,
          username: authorName,
        };
        const components = this.generateButtonRoLeComponents(
          dataGenerateButtonComponents,
          parsedRoles,
        );

        await messsage.update({ embed: [msgResults], components });
      }

      if (typeButtonRes === EmbebButtonType.CONFIRM) {
        const bot = await this.userRepository.findOne({
          where: { user_id: process.env.UTILITY_BOT_ID || '' },
        });
        if (bot && bot.roleClan) {
          const clanData = bot.roleClan[clanId];
          if (clanData && clanData.roleMax) {
            const highestRoleId = clanData.roleMax;
            const user = await this.userRepository.findOne({
              where: { user_id: data.user_id },
            });
            let request: MezonUpdateRoleBody = {
              add_user_ids: [data.user_id],
              title: role_title,
              clan_id: clanId,
              max_permission_id: highestRoleId,
            };
            if (user) {
              const userRoleClan = user.roleClan || {};
              const userClanData = userRoleClan[clanId] || {
                roles: [],
                roleMax: undefined,
              };

              const index = userClanData.roles.findIndex(
                (r) => r.roleId === role_id,
              );
              if (index === -1) {
                userClanData.roles.push({
                  roleId: role_id,
                  maxLevelPermission: data.role?.max_level_permission || 0,
                });
              } else {
                userClanData.roles.splice(index, 1);
                request = {
                  remove_user_ids: [data.user_id],
                  title: role_title,
                  clan_id: clanId,
                  max_permission_id: highestRoleId,
                };
              }

              if (
                !userClanData.roles.length ||
                userClanData.roleMax === role_id
              ) {
                userClanData.roleMax =
                  userClanData.roles.reduce(
                    (max, r) =>
                      r.maxLevelPermission > max.maxLevelPermission ? r : max,
                    { roleId: '', maxLevelPermission: -1 },
                  ).roleId || undefined;
              }

              userRoleClan[clanId] = userClanData;

              await this.userRepository.update(
                { user_id: data.user_id },
                { roleClan: userRoleClan },
              );
            }

            await clan.updateRole(role_id, request);
          }
        }
      }
    } catch (error) {}
  }
}
