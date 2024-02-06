import { Injectable } from '@nestjs/common';
import { IIdempotencyRepository } from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Operation } from '@lib/core';
import { IdempotencyDocument, IdempotencyModel } from '../models';
import { Utils } from 'apps/configurator/src/common/utils';
import mongoose from 'mongoose';
import { QueryOptions } from '../../classes/common';

@Injectable()
export class IdempotencyRepository implements IIdempotencyRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(IdempotencyModel.name)
    private readonly idempotencyModel: Model<IdempotencyDocument>,
  ) {}

  public async getById(id: string, options?: QueryOptions): Promise<Operation> {
    const conditions = {
      _id: Utils.toObjectId(id),
    };
    let query = this.idempotencyModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toObject() as Operation;
  }

  public async getByOperationName(
    name: string,
    options?: QueryOptions,
  ): Promise<Operation> {
    const conditions = {
      name,
    };
    let query = this.idempotencyModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toObject() as Operation;
  }

  public async saveOperation(
    operation: Operation,
    options?: QueryOptions,
  ): Promise<void> {
    const document = new this.idempotencyModel({
      ...operation,
    });
    const query = options?.session
      ? document.save({ session: options.session })
      : document.save();
    await query;
    // return document.toObject() as Operation;
  }

  public async deleteByName(
    name: string,
    options?: QueryOptions,
  ): Promise<void> {
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const document = await this.idempotencyModel
        .findOne({
          name,
        })
        .session(session);
      if (!document) {
        throw new Error('Operation not found');
      }
      await document.delete({
        session,
      });
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
  }
}
