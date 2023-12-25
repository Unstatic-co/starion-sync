import { ProviderConfig } from '../dataProvider.entity';
import {
  DataSourceAuthConfig,
  DataSourceConfig,
  ProviderAuthConfig,
} from '../dataSourceConfig.interface';

export interface AirTableProviderConfig extends ProviderConfig {
  baseId: string;
}
export interface AirTableDataSourceConfig extends DataSourceConfig {
  baseId: string;
  tableId: string;
  auth: AirTableDataSourceAuthConfig;
}

export interface AirTableProviderAuthConfig extends ProviderAuthConfig {
  refreshToken: string;
}

export interface AirTableDataSourceAuthConfig extends DataSourceAuthConfig {
  refreshToken: string;
  accessToken?: string;
}
