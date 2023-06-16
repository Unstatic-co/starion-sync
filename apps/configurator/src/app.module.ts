import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  appConfigRegister,
  databaseConfigRegister,
  microsoftConfigRegister,
} from '@lib/core/config';
import { DatabaseModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { DataProviderModule } from './modules/data-provider/data-provider.module';
import { DataSourceModule } from './modules/data-source/data-source.module';
import { SyncConnectionModule } from './modules/sync-connection/syncConnection.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        brokerConfigRegister,
        microsoftConfigRegister,
      ],
    }),
    DatabaseModule.forRootAsync(),
    BrokerModule,
    ScheduleModule.forRoot(),
    CommonModule,
    DataProviderModule,
    DataSourceModule,
    SyncConnectionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
