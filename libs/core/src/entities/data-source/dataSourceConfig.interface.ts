export interface ProviderAuthConfig {
  [key: string]: any;
}

export interface DataSourceAuthConfig {
  [key: string]: any;
}

export interface DataSourceConfig {
  auth: DataSourceAuthConfig;
}
