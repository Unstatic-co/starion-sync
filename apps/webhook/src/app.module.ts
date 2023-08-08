import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import { appConfigRegister, databaseConfigRegister } from '@lib/core/config';
import { DatabaseModule, LoggerModule } from '@lib/modules';
import { BrokerModule } from './modules/broker/broker.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { brokerConfigRegister } from './config/broker.config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfigRegister, databaseConfigRegister, brokerConfigRegister],
    }),
    LoggerModule,
    DatabaseModule.forRootAsync(),
    BrokerModule,
    CommonModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
