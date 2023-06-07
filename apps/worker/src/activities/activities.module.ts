import { Module } from '@nestjs/common';
import { GoogleSheetsActivities } from './google-sheets/googleSheet.activities';
import { CommonActivities } from './common.activities';
import { TestActivities } from './test.activities';
import { DatabaseModule } from '@lib/modules';
import { RepositoryModule } from '@lib/modules/repository';

@Module({
  imports: [DatabaseModule.forRootAsync(), RepositoryModule.registerAsync()],
  controllers: [],
  providers: [CommonActivities, TestActivities, GoogleSheetsActivities],
  exports: [CommonActivities, TestActivities, GoogleSheetsActivities],
})
export class ActivitiesModule {}
