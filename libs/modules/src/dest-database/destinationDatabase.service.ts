import { DataSourceId } from '@lib/core';

export interface IDestinationDatabaseService {
  test(): Promise<void>;
  getSchema(id: DataSourceId): Promise<any>;
  getData(id: DataSourceId): Promise<any>;
}
