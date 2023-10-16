import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, ExcelDataSource } from 'src/entities';
import { DataSourceController } from './dataSource.controller';
import { DataSourceService } from './dataSource.service';
import { BullModule } from '@nestjs/bull';
import { FormSyncModule } from '../formsync/formsync.module';
import { CleanerModule } from '../cleaner/cleaner.module';
import {
  EXCEL_JOB_QUEUES,
  GOOGLE_SHEETS_JOB_QUEUES,
} from 'src/common/inject-tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcelDataSource, DataSource]),
    BullModule.registerQueue(
      { name: EXCEL_JOB_QUEUES.UPDATE_METADATA },
      { name: GOOGLE_SHEETS_JOB_QUEUES.UPDATE_METADATA },
    ),
    forwardRef(() => FormSyncModule),
    CleanerModule,
  ],
  controllers: [DataSourceController],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
