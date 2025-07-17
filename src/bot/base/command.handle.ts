import { ChannelMessage } from 'mezon-sdk';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommandStorage } from '../base/storage';
import { CommandMessage } from './command.abstract';
import { extractMessage } from '../utils/helps';
import { CommandBaseInterface } from './interfaces/asterisk.interface';

@Injectable()
export class CommandBase implements CommandBaseInterface {
  public commandList: { [key: string]: CommandMessage };

  constructor(private readonly moduleRef: ModuleRef) {}

  execute(messageContent: string, message: ChannelMessage) {
    const [commandName, args] = extractMessage(messageContent);

    const target = CommandStorage.getCommand(commandName as string);
    if (target) {
      const command = this.moduleRef.get(target);

      if (command) {
        return command.execute(args, message);
      }
    }
  }
}
