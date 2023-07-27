import { Injectable } from '@nestjs/common';
import {
  CreateTriggerData,
  ITriggerRepository,
  UpdateSyncConnectionData,
} from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Utils } from 'apps/configurator/src/common/utils';
import { QueryOptions } from '../../classes';
import mongoose from 'mongoose';
import { TriggerDocument, TriggerModel } from '../models/trigger.model';
import { Trigger } from '@lib/core/entities/trigger';

@Injectable()
export class TriggerRepository implements ITriggerRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(TriggerModel.name)
    private triggerModel: Model<TriggerDocument>,
  ) {}

  public async getById(id: string, options?: QueryOptions) {
    const conditions = {
      _id: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.triggerModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async getByWorkflowId(id: string, options?: QueryOptions) {
    const conditions = {
      'workflow.id': Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.triggerModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async getByWorkflowIds(syncflowIds: string[]) {
    const result = await this.triggerModel.find({
      'workflow.id': { $in: syncflowIds.map((id) => Utils.toObjectId(id)) },
    });
    return result.map((item) => item.toJSON() as Trigger);
  }

  public async create(data: CreateTriggerData) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {});
    return result;
  }

  public async update(data: UpdateSyncConnectionData, options?: QueryOptions) {
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
      const trigger = await this.triggerModel
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
