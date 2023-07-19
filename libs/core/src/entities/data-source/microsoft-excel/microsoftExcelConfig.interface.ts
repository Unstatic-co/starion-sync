import { ProviderConfig } from '../dataProvider.entity';
import {
  DataSourceAuthConfig,
  DataSourceConfig,
  ProviderAuthConfig,
} from '../dataSourceConfig.interface';

export interface ExcelProviderConfig extends ProviderConfig {
  workbookId: string;
  driveId?: string;
}
export interface ExcelDataSourceConfig extends DataSourceConfig {
  driveId?: string;
  workbookId: string;
  worksheetId: string;
  worksheetName: string;
}

export interface ExcelProviderAuthConfig extends ProviderAuthConfig {
  refreshToken: string;
}

export interface ExcelDataSourceAuthConfig extends DataSourceAuthConfig {
  refreshToken: string;
  accessToken?: string;
}
