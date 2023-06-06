import { DataDiscoverer } from './data-discoverer.factory';

export class GoogleSheetsDiscoverer implements DataDiscoverer {
  constructor() {}

  public async discover(): Promise<any> {
    console.log('google sheets discover');
  }
}
