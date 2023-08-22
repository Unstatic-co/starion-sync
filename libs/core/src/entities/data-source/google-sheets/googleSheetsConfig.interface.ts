import { ProviderConfig } from '../dataProvider.entity';
import {
  DataSourceAuthConfig,
  DataSourceConfig,
  ProviderAuthConfig,
} from '../dataSourceConfig.interface';

export interface GoogleSheetsProviderConfig extends ProviderConfig {
  spreadSheetsId: string;
}
export interface GoogleSheetsDataSourceConfig extends DataSourceConfig {
  spreadSheetsId: string;
  sheetId: string;
}

export interface GoogleSheetsProviderAuthConfig extends ProviderAuthConfig {
  refreshToken: string;
}

export interface GoogleSheetsDataSourceAuthConfig extends DataSourceAuthConfig {
  refreshToken: string;
  accessToken?: string;
}
