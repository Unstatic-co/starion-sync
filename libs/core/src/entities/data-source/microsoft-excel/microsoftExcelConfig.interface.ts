import { ProviderClientConfig, ProviderConfig } from '../dataProvider.entity';
import { ProviderAuthConfig } from '../dataSourceConfig.interface';

export interface ExcelProviderConfig extends ProviderConfig {
  workbookId: string;
}
export interface ExcelDataSourceConfig extends ExcelProviderConfig {
  worksheetId: string;
}

export interface ExcelAuthConfig extends ProviderAuthConfig {
  refreshToken: string;
}

export interface ExcelClientConfig extends ProviderClientConfig {
  accessToken: string;
}
