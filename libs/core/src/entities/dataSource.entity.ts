import { BaseEntity } from './baseEntity';

export enum DataSourceProvider {
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
  AIR_TABLE = 'AIR_TABLE',
}

export class DataSource extends BaseEntity {
  id: string;
  name: string;
  provider: DataSourceProvider;
}
