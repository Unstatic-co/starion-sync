import { ProviderConfig } from '../dataProvider.entity';
import {
  DataSourceAuthConfig,
  DataSourceConfig,
  ProviderAuthConfig,
} from '../dataSourceConfig.interface';

export interface GoogleSheetsProviderConfig extends ProviderConfig {
  spreadsheetId: string;
}
export interface GoogleSheetsDataSourceConfig extends DataSourceConfig {
  spreadsheetId: string;
  sheetId: string;
  auth: GoogleSheetsDataSourceAuthConfig;
}

export interface GoogleSheetsProviderAuthConfig extends ProviderAuthConfig {
  refreshToken: string;
}

export interface GoogleSheetsDataSourceAuthConfig extends DataSourceAuthConfig {
  refreshToken: string;
  accessToken?: string;
}
