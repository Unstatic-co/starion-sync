import { Module, forwardRef } from '@nestjs/common';
import { MicrosoftModule } from '../third-party/microsoft';
import { FormSyncController } from './formsync.controller';
import { FormSyncService } from './formsync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DataSource,
  DelayedFormSync,
  ExcelDataSource,
  FormSync,
  GoogleSheetsDataSource,
} from 'src/entities';
import { FormSyncFactory } from './formsync.factory';
import {
  ExcelFormSyncRespectMetadataProcessor,
  ExcelFormSyncService,
  ExcelUpdateMetadataProcessor,
} from './excel';
import { BullModule } from '@nestjs/bull';
import { MetadataModule } from '../metadata/metadata.module';
import { GoogleModule } from '../third-party/google';
import {
  GoogleSheetsFormSyncRespectMetadataProcessor,
  GoogleSheetsFormSyncService,
  GoogleSheetsUpdateMetadataProcessor,
} from './google-sheets';
import { DataSourceModule } from '../datasource/dataSource.module';
import {
  EXCEL_JOB_QUEUES,
  GOOGLE_SHEETS_JOB_QUEUES,
} from 'src/common/inject-tokens';
import { FormSyncCommonService } from './common.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormSync,
      DataSource,
      DelayedFormSync,
      ExcelDataSource,
      GoogleSheetsDataSource,
    ]),
    BullModule.registerQueue(
      { name: EXCEL_JOB_QUEUES.UPDATE_METADATA },
      { name: EXCEL_JOB_QUEUES.FORM_SYNC_RESPECT_METADATA },
      { name: GOOGLE_SHEETS_JOB_QUEUES.UPDATE_METADATA },
      { name: GOOGLE_SHEETS_JOB_QUEUES.FORM_SYNC_RESPECT_METADATA },
    ),
    // forwardRef(() => DataSourceModule),
    MetadataModule,
    MicrosoftModule,
    GoogleModule,
  ],
  controllers: [FormSyncController],
  providers: [
    FormSyncService,
    FormSyncCommonService,
    FormSyncFactory,
    ExcelFormSyncService,
    ExcelUpdateMetadataProcessor,
    ExcelFormSyncRespectMetadataProcessor,
    GoogleSheetsFormSyncService,
    GoogleSheetsUpdateMetadataProcessor,
    GoogleSheetsFormSyncRespectMetadataProcessor,
  ],
  exports: [FormSyncService, ExcelFormSyncService, GoogleSheetsFormSyncService],
})
export class FormSyncModule {}
