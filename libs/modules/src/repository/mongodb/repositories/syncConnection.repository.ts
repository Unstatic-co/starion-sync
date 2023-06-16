import { Injectable } from '@nestjs/common';
import {
  CreateSyncConnectionData,
  ISyncConnectionRepository,
  UpdateSyncConnectionData,
} from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SyncflowRegistry,
  defaultSyncConnectionState,
  defaultSyncflowState,
} from '@lib/core';
import { Utils } from 'apps/configurator/src/common/utils';
import { QueryOptions } from '../../classes';
import mongoose from 'mongoose';
import { SyncConnectionDocument, SyncConnectionModel } from '../models';
import { TriggerRegistry } from '@lib/core/entities/trigger';
import { TriggerDocument, TriggerModel } from '../models/trigger.model';
import { SyncflowDocument, SyncflowModel } from '../models/syncflow.model';

@Injectable()
export class SyncConnectionRepository implements ISyncConnectionRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(SyncConnectionModel.name)
    private syncConnectionModel: Model<SyncConnectionDocument>,
    @InjectModel(TriggerModel.name)
    private triggerModel: Model<TriggerDocument>,
    @InjectModel(SyncflowModel.name)
    private syncflowModel: Model<SyncflowDocument>,
  ) {}

  public async getById(id: string) {
    const dataProvider = await this.syncConnectionModel.findOne({
      _id: Utils.toObjectId(id),
    });
    if (!dataProvider) return null;
    return dataProvider.toJSON();
  }

  public async getByDataSourceId(id: string) {
    const dataProvider = await this.syncConnectionModel.findOne({
      sourceId: Utils.toObjectId(id),
    });
    if (!dataProvider) return null;
    return dataProvider.toJSON();
  }

  public async create(data: CreateSyncConnectionData) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      // create syncflows
      const syncflowDocuments = await Promise.all(
        data.syncflows.map(async (syncflowData) => {
          const syncflowFromRegistry = SyncflowRegistry.get(syncflowData.name);
          const trigger = TriggerRegistry.get(syncflowData.trigger.name);
          const syncflow = new this.syncflowModel({
            name: syncflowFromRegistry.name,
            attributes: syncflowFromRegistry.attributes,
            sourceId: data.sourceId,
            state: defaultSyncflowState,
            config: syncflowData.config,
            trigger: {
              name: trigger.name,
              type: trigger.type,
            },
          });
          await syncflow.save({ session });
          return syncflow;
        }),
      );
      // create triggers
      const triggerDocuments = await Promise.all(
        syncflowDocuments.map(async (syncflow, index) => {
          const syncflowData = data.syncflows[index];
          const trigger = new this.triggerModel({
            name: syncflow.trigger.name,
            type: syncflow.trigger.type,
            workflow: {
              id: syncflow.id,
              name: syncflow.name,
            },
            config: syncflowData.trigger.config,
          });
          await trigger.save({ session });
          return trigger;
        }),
      );
      // create sync connection
      const syncConnection = new this.syncConnectionModel({
        state: defaultSyncConnectionState,
        sourceId: data.sourceId,
        config: data.config,
        syncflows: syncflowDocuments.map((syncflow) => ({
          id: syncflow._id,
          name: syncflow.name,
          trigger: {
            id: triggerDocuments.find(
              (trigger) => trigger.workflow.id === syncflow._id,
            )?.id,
            name: syncflow.trigger.name,
            type: syncflow.trigger.type,
          },
          config: syncflow.config,
        })),
      });
      await syncConnection.save({ session });
      result = syncConnection.toJSON();
    });
    return result;
  }

  public async update(data: UpdateSyncConnectionData, options?: QueryOptions) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      const syncConnection = await this.syncConnectionModel
        .findOne({
          _id: Utils.toObjectId(data.id),
        })
        .session(session);
      if (!syncConnection) {
        throw new Error('DataSource not found');
      }
      const updates = {};
      await syncConnection
        .updateOne({
          $set: updates,
        })
        .session(session);
      if (options?.new) {
        result = await this.syncConnectionModel
          .findOne({
            _id: Utils.toObjectId(data.id),
          })
          .session(session);
      }
    });
    if (options?.new) {
      return result;
    }
  }

  public async delete(): Promise<void> {}
}
