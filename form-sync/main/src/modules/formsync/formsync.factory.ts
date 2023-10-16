import { Injectable } from '@nestjs/common';
import { FormSyncDto } from './dto/formsync.dto';
import { ExcelFormSyncService } from './excel';
import { ProviderType } from 'src/lib/provider';
import { FormSync } from 'src/entities';
import { GoogleSheetsFormSyncService } from './google-sheets';

export interface IFormSyncService {
  run(data: FormSync): Promise<any>;
}

@Injectable()
export class FormSyncFactory {
  constructor(
    private readonly excelFormSyncService: ExcelFormSyncService,
    private readonly googleSheetsFormSyncService: GoogleSheetsFormSyncService,
  ) {}

  public get(providerType: ProviderType): IFormSyncService {
    switch (providerType) {
      case ProviderType.MicrosoftExcel:
        return this.excelFormSyncService;
      case ProviderType.GoogleSheets:
        return this.googleSheetsFormSyncService;
      default:
        throw new Error('Unknown provider type');
    }
  }
}
