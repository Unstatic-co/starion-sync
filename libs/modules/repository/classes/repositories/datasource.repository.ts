import { IRepository } from '../baseRepository';
import { DataSource } from '../../../entities/dataSource.entity';

export interface IDataSourceRepository extends IRepository {
  getById(id: string): Promise<DataSource>;
  create(): Promise<DataSource>;
  // async getDataSourceById(id: string): Promise<IDataSource> {
  // return {
  // id: '1',
  // name: 'test',
  // provider: DataSourceProvider.GOOGLE_SHEETS,
  // };
  // }
}
