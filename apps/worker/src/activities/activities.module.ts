import { Module } from '@nestjs/common';
import { GoogleSheetsActivities } from './google-sheets/googleSheet.activities';
import { CommonActivities } from './common.activities';
import { TestActivities } from './test.activities';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';
import { DestinationDatabaseModule } from '@lib/modules/dest-database';

@Module({
  imports: [
    DatabaseModule.forRootAsync(),
    RepositoryModule.registerAsync(),
    DestinationDatabaseModule.forRoot(),
    DestinationDatabaseModule.forFeature(),
  ],
  controllers: [],
  providers: [CommonActivities, TestActivities, GoogleSheetsActivities],
  exports: [CommonActivities, TestActivities, GoogleSheetsActivities],
})
export class ActivitiesModule {}
