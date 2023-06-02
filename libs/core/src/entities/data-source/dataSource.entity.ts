import { BaseEntity } from '../baseEntity';
import { DataSourceInterface } from './dataSource.interface';

export enum DataSourceProvider {
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
  AIR_TABLE = 'AIR_TABLE',
}

export class DataSource extends BaseEntity implements DataSourceInterface {
  id: string;
  name: string;
  provider: DataSourceProvider;
  createdAt: Date;
  updatedAt: Date;

  public discover(): Promise<DataSourceCollection[]> {
    throw new Error('Method not implemented.');
  }
}

export class DataSourceCollection extends BaseEntity {
  dataSourceId: string;
  name: string;
}
