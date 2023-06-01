import { BaseEntity } from '@lib/core';

export interface IRepository {
  getById(id: string): Promise<BaseEntity>;
}
