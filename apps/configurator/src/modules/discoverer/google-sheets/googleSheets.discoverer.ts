import { Injectable, Logger } from '@nestjs/common';
import { DataDiscoverer } from '../data-discoverer.factory';

@Injectable()
export class GoogleSheetsDiscoverer implements DataDiscoverer {
  private readonly logger = new Logger(GoogleSheetsDiscoverer.name);

  constructor() {}

  public async discover(): Promise<any> {
    console.log('google sheets discover');
  }

  public async check(): Promise<any> {
    return {};
  }
}
