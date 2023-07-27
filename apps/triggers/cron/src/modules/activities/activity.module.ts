import { Module } from '@nestjs/common';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';
import { DestinationDatabaseModule } from '@lib/modules/dest-database';
import { CommonActivities } from './common.activities';
import { BrokerModule } from '../broker/broker.module';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    DatabaseModule.forRootAsync(),
    RepositoryModule.registerAsync(),
    DestinationDatabaseModule.forRoot(),
    DestinationDatabaseModule.forFeature(),
    BrokerModule,
    CommonModule,
  ],
  providers: [BrokerActivities, CommonActivities],
  exports: [BrokerActivities, CommonActivities],
})
export class ActivityModule {}
