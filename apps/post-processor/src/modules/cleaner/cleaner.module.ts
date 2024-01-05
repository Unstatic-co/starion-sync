import { RepositoryModule } from '@lib/modules';
import { Module } from '@nestjs/common';
import { CleanerService } from './cleaner.service';
import { CleanerFactory } from './cleaner.factory';
import { StorageModule } from '../storage/storage.module';
import { MicrosoftExcelDataProviderCleaner, MicrosoftExcelWorkflowCleaner } from './excel';
import { GoogleSheetsDataProviderCleaner, GoogleSheetsWorkflowCleaner } from './google-sheets';

@Module({
  imports: [RepositoryModule.registerAsync(), StorageModule],
  controllers: [],
  providers: [
    CleanerService,
    CleanerFactory,
    MicrosoftExcelWorkflowCleaner,
    GoogleSheetsWorkflowCleaner,
    MicrosoftExcelDataProviderCleaner,
    GoogleSheetsDataProviderCleaner,
  ],
  exports: [CleanerService, CleanerFactory],
})
export class CleanerModule { }
