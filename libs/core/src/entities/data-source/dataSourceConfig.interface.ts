import { ProviderConfig } from './dataProvider.entity';

export interface ProviderAuthConfig {
  [key: string]: any;
}

export interface DataSourceAuthConfig {
  [key: string]: any;
}

export interface DataSourceDestinationConfig {
  [key: string]: any;
  tableName?: string;
}

export interface DataSourceConfig extends ProviderConfig {
  auth: DataSourceAuthConfig;
  dest?: DataSourceDestinationConfig;
}
