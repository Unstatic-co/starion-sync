import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Utils } from 'apps/configurator/src/common/utils';
import { QueryOptions } from '../../classes';
import mongoose from 'mongoose';
import {
  CreateSyncflowData,
  ISyncflowRepository,
  UpdateSyncflowData,
} from '../../classes/repositories/syncflow.repository';
import { SyncflowDocument, SyncflowModel } from '../models';

@Injectable()
export class SyncflowRepository implements ISyncflowRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(SyncflowModel.name)
    private syncflowModel: Model<SyncflowDocument>,
  ) {}

  public async getById(id: string, options?: QueryOptions) {
    const conditions = {
      _id: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.syncflowModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async create(data: CreateSyncflowData) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {});
    return result;
  }

  public async update(data: UpdateSyncflowData, options?: QueryOptions) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {});
    if (options?.new) {
      return result;
    }
  }

  public async delete(id: string, options?: QueryOptions): Promise<void> {
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const trigger = await this.syncflowModel
        .findOne({
          _id: Utils.toObjectId(id),
          isDeleted: false,
        })
        .session(session);
      if (!trigger) {
        throw new Error('Trigger not found');
      }
      await trigger
        .updateOne({
          $set: {
            isDeleted: true,
          },
        })
        .session(session);
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
  }
}
