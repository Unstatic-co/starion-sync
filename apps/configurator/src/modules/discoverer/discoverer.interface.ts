import { DataSourceConfig, ProviderConfig } from '@lib/core';

export interface DiscoveredDataSource {
  id: string;
  name?: string;
  // providerType: ProviderType;
}

export interface DiscoveredExcelDataSource extends DiscoveredDataSource {
  id: string;
  name: string;
  position: number;
  visibility: string;
}

export interface DiscoveredGoogleSheetsDataSource extends DiscoveredDataSource {
  id: string;
  sheetId: number;
  title: string;
  index: number;
  sheetType: string;
  gridProperties: {
    rowCount: number;
    columnCount: number;
  };
}

export interface DataDiscoverer {
  checkDataSource(dataSourceConfig: DataSourceConfig): Promise<any>;
  discoverConfig(
    dataSourceConfig: Partial<DataSourceConfig>,
  ): Promise<DataSourceConfig>;
  discoverProvider(
    providerConfig: ProviderConfig,
  ): Promise<DiscoveredDataSource[]>;
}
