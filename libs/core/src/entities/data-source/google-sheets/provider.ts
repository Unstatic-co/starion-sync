import { ProviderState } from '../dataProvider.entity';

export interface GoogleSheetsProviderState extends ProviderState {
  downloadedAt: Date;
}
