import { Module } from '@nestjs/common';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';
import { CommonActivities } from './common.activities';
import { BrokerModule } from '../broker/broker.module';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { CommonModule } from '../common/common.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { WorkflowActivities } from './workflow.activities';

@Module({
  imports: [
    DatabaseModule.forRootAsync(),
    RepositoryModule.registerAsync(),
    BrokerModule,
    WorkflowModule,
    CommonModule,
  ],
  providers: [
    BrokerActivities,
    BrokerActivities,
    WorkflowActivities,
    CommonActivities,
  ],
  exports: [
    BrokerActivities,
    BrokerActivities,
    WorkflowActivities,
    CommonActivities,
  ],
})
export class ActivityModule {}
