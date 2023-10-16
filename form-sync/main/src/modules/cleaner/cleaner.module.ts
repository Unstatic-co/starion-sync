import { Module } from '@nestjs/common';
import { CleanerFactory } from './cleaner.factory';
import { GoogleSheetsCleanerService } from './google-sheets';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import {
  DataSource,
  ExcelDataSource,
  GoogleSheetsDataSource,
} from 'src/entities';
import { ExcelCleanerService } from './excel';
import {
  EXCEL_JOB_QUEUES,
  GOOGLE_SHEETS_JOB_QUEUES,
} from 'src/common/inject-tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataSource,
      ExcelDataSource,
      GoogleSheetsDataSource,
    ]),
    BullModule.registerQueue(
      { name: EXCEL_JOB_QUEUES.UPDATE_METADATA },
      { name: GOOGLE_SHEETS_JOB_QUEUES.UPDATE_METADATA },
    ),
  ],
  controllers: [],
  providers: [CleanerFactory, ExcelCleanerService, GoogleSheetsCleanerService],
  exports: [CleanerFactory],
})
export class CleanerModule {}
