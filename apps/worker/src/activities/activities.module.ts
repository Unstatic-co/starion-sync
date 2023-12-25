import { Module } from '@nestjs/common';
import { CommonActivities } from './common.activities';
import { TestActivities } from './test.activities';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';
import { MicrosoftExcelActivities } from './microsoft-excel';
import { WorkflowModule } from '../modules/workflow/worflow.module';
import { WorkflowActivities } from './workflow.activities';
import { BrokerModule } from '../modules/broker/broker.module';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { GoogleModule, MicrosoftModule } from '@lib/modules/third-party';
import { GoogleSheetsActivities } from './google-sheets';

@Module({
  imports: [
    DatabaseModule.forRootAsync(),
    RepositoryModule.registerAsync(),
    BrokerModule,
    WorkflowModule,
    MicrosoftModule,
    GoogleModule,
  ],
  providers: [
    CommonActivities,
    TestActivities,
    BrokerActivities,
    WorkflowActivities,
    GoogleSheetsActivities,
    MicrosoftExcelActivities,
  ],
  exports: [
    CommonActivities,
    TestActivities,
    BrokerActivities,
    WorkflowActivities,
    GoogleSheetsActivities,
    MicrosoftExcelActivities,
  ],
})
export class ActivitiesModule {}
