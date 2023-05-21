import { BaseEntity } from '../../entities';

export interface IRepository {
  getById(id: string): Promise<BaseEntity>;
}
