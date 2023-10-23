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
