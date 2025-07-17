import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotGateway } from './bot/events/bot.gateways';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  const bot = app.get(BotGateway);
  bot.initEvent();
}
bootstrap();
