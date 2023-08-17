import { Module } from '@nestjs/common';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';
import { DestinationDatabaseModule } from '@lib/modules/dest-database';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { DataSourceModule } from '../data-source/data-source.module';
import { SyncConnectionModule } from '../sync-connection/syncConnection.module';
import { CommonActivities } from './common.activities';
import { BrokerModule } from '../broker/broker.module';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { SyncConnectionActivities } from './syncConnection.activities';
import { CommonModule } from '../common/common.module';
import { TriggerModule } from '../trigger/trigger.module';
import { TriggerActivities } from './trigger.activities';
import { DataSourceActivities } from './dataSource.activities';

@Module({
  imports: [
    DatabaseModule.forRootAsync(),
    RepositoryModule.registerAsync(),
    DestinationDatabaseModule.forRoot(),
    DestinationDatabaseModule.forFeature(),
    BrokerModule,
    DataProviderModule,
    DataSourceModule,
    SyncConnectionModule,
    TriggerModule,
    CommonModule,
  ],
  providers: [
    BrokerActivities,
    CommonActivities,
    SyncConnectionActivities,
    TriggerActivities,
    DataSourceActivities,
  ],
  exports: [
    BrokerActivities,
    CommonActivities,
    SyncConnectionActivities,
    TriggerActivities,
    DataSourceActivities,
  ],
})
export class ActivityModule {}
