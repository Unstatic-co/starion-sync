import { BaseEntity } from '@lib/core';
import { QueryOptions } from './common';

export interface IRepository {
  getById(id: string, options?: QueryOptions): Promise<BaseEntity>;
}
