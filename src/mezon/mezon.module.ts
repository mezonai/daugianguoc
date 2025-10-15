import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MezonClientService } from './services/mezon-client.service';
import { MezonModuleAsyncOptions } from './dto/MezonModuleAsyncOptions';

@Global()
@Module({})
export class MezonModule {
  static forRootAsync(options: MezonModuleAsyncOptions): DynamicModule {
    return {
      module: MezonModule,
      imports: options.imports,
      providers: [
        {
          provide: MezonClientService,
          useFactory: async (configService: ConfigService) => {
            const token = configService.get<string>('MEZON_TOKEN');
            const botId = configService.get<string>('BOT_ID');
            if (!token || !botId) {
              throw new Error(
                'MEZON_TOKEN and MEZON_BOT_ID environment variables are required',
              );
            }
            const client = new MezonClientService(botId, token);

            await client.initializeClient();

            return client;
          },
          inject: [ConfigService],
        },
      ],
      exports: [MezonClientService],
    };
  }
}
