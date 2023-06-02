import { DataSourceCollection } from './dataSource.entity';

export interface DataSourceInterface {
  discover(): Promise<DataSourceCollection[]>;
}
