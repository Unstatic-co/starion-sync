import { ProviderType } from '@lib/core';
import { GoogleSheetsDiscoverer } from './google-sheets.discoverer';
import { Injectable } from '@nestjs/common';

export interface DataDiscoverer {
  discover(): Promise<DiscoveredDataSource[]>;
}

export interface DiscoveredDataSource {
  name: string;
  providerType: ProviderType;
}

@Injectable()
export class DataDiscovererFactory {
  constructor() {}

  public get(providerType: ProviderType): DataDiscoverer {
    switch (providerType) {
      case ProviderType.GOOGLE_SHEETS:
        return new GoogleSheetsDiscoverer();
      default:
        throw new Error('Unknown provider type');
    }
  }
}
