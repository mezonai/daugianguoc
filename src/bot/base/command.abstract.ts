import { ChannelMessage, MezonClient } from 'mezon-sdk';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';

export abstract class CommandMessage {
  protected client: MezonClient;

  constructor(protected clientService: MezonClientService) {
    this.client = this.clientService.getClient();
  }

  protected async getChannelMessage(message: ChannelMessage) {
    const clan = this.client.clans.get(message.clan_id!);
    const channel = await clan?.channels.fetch(message.channel_id);
    return await channel?.messages.fetch(message.message_id!);
  }

  abstract execute(
    args: string[],
    message: ChannelMessage,
    commandName?: string,
  ): any;
}
