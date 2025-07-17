import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { User } from './models/user.entity';
import { ExtendersService } from './services/extenders.services';
import { DynamicCommandService } from './services/dynamic.service';
import { HelpCommand } from './commands/help/help.command';
import { BotGateway } from './events/bot.gateways';
import { ListenerChannelMessage } from './listeners/onChannelMessage.listener';
import { CommandBase } from './base/command.handle';
import { AvatarCommand } from './commands/avatar/avatar.command';

import { ListenerMessageButtonClicked } from './listeners/onMessageButtonClicked.listener';
import { QRCodeCommand } from './commands/qrcode/qrcode.command';
import { ListenerTokenSend } from './listeners/tokensend.handle';
import { WelcomeMessageHandler } from './listeners/welcomeMessages';
import { WelcomeMessage } from './models/welcomeMessage.entity';
import { WelcomeMsgCommand } from './commands/welcomeMessages/welcomeMessages.command';
import { WelcomeMsgInfoCommand } from './commands/welcomeMessages/welcomeMessagesInfo.command';
import { RoleCommand } from './commands/selfAssignableRoles/role.command';
import { RoleService } from './commands/selfAssignableRoles/role.service';
import { WhiteListAddCommand } from './commands/selfAssignableRoles/whiteList';
import { BlockRut } from './models/blockrut.entity';
// import { UnbanCommand } from './commands/ban/unban';
import { DauGiaCommand } from './commands/auction/auction.command';
import { DauGiaService } from './commands/auction/auction.service';
import { Daugia } from './models/daugia.entity';

@Module({
  imports: [
    MulterModule.register({
      dest: './files',
    }),
    DiscoveryModule,
    TypeOrmModule.forFeature([User, WelcomeMessage, BlockRut, Daugia]),
    HttpModule,
  ],
  providers: [
    CommandBase,
    BotGateway,
    ListenerChannelMessage,
    ListenerMessageButtonClicked,
    HelpCommand,
    AvatarCommand,
    QRCodeCommand,
    ConfigService,
    ExtendersService,
    DynamicCommandService,
    ListenerTokenSend,
    WelcomeMessageHandler,
    WelcomeMsgCommand,
    WelcomeMsgInfoCommand,
    RoleCommand,
    RoleService,
    WhiteListAddCommand,
    DauGiaService,
    // UnbanCommand,
    DauGiaCommand,
  ],
  controllers: [],
})
export class BotModule {}
