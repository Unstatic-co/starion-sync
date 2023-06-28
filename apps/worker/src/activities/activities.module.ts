import { Module } from '@nestjs/common';
import { GoogleSheetsActivities } from './google-sheets/googleSheet.activities';
import { CommonActivities } from './common.activities';
import { TestActivities } from './test.activities';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';
import { DestinationDatabaseModule } from '@lib/modules/dest-database';
import { MicrosoftExcelActivities } from './microsoft-excel';
import { WorkflowModule } from '../modules/workflow/worflow.module';
import { WorkflowActivities } from './workflow.activities';
import { BrokerModule } from '../modules/broker/broker.module';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';

@Module({
  imports: [
    DatabaseModule.forRootAsync(),
    RepositoryModule.registerAsync(),
    DestinationDatabaseModule.forRoot(),
    DestinationDatabaseModule.forFeature(),
    BrokerModule,
    WorkflowModule,
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
