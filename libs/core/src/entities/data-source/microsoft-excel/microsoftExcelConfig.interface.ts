import { ProviderClientConfig, ProviderConfig } from '../dataProvider.entity';
import {
  DataSourceAuthConfig,
  ProviderAuthConfig,
} from '../dataSourceConfig.interface';

export interface ExcelProviderConfig extends ProviderConfig {
  workbookId: string;
  driveId: string;
}
export interface ExcelDataSourceConfig extends ExcelProviderConfig {
  worksheetId: string;
}

export interface ExcelProviderAuthConfig extends ProviderAuthConfig {
  refreshToken: string;
}

export interface ExcelDataSourceAuthConfig extends DataSourceAuthConfig {
  refreshToken: string;
}

export interface ExcelClientConfig extends ProviderClientConfig {
  accessToken: string;
}
