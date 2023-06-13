export interface DiscoveredDataSource {
  name?: string;
  // providerType: ProviderType;
}

export interface DiscoveredExcelDataSource extends DiscoveredDataSource {
  id: string;
  name: string;
  position: number;
  visibility: string;
}
