import { ProviderState } from '../dataProvider.entity';

export interface GoogleSheetsProviderState extends ProviderState {
  downloadedAt: Date;
  timeZone: string;
  sheets: {
    [sheetId: string]: {
      name: string;
      index: number; // from 0
    };
  };
}
