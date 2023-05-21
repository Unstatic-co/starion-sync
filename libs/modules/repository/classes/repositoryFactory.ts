import { IDataSourceRepository } from './repositories';

export interface IRepositoryFactory {
  createDataSourceRepository(): IDataSourceRepository;
}
