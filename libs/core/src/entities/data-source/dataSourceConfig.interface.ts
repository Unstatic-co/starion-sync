import { ProviderConfig } from './dataProvider.entity';

export interface ProviderAuthConfig {
  [key: string]: any;
}

export interface DataSourceAuthConfig {
  [key: string]: any;
}

export interface DataSourceConfig extends ProviderConfig {
  auth: DataSourceAuthConfig;
}
