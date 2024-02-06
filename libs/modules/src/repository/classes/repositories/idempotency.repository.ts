import { Operation } from '@lib/core';
import { IRepository } from '../base';
import { QueryOptions } from '../common';
import { OperationName } from '@lib/core';

export interface IIdempotencyRepository extends IRepository {
  getByOperationName(
    operationName: OperationName,
    options?: QueryOptions,
  ): Promise<Operation | null>;
  saveOperation(operation: Operation, options?: QueryOptions): Promise<void>;
}
