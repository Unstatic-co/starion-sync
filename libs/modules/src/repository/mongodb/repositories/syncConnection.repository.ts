import { Inject, Injectable, Logger } from '@nestjs/common';
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
import {
  DataSourceDocument,
  DataSourceModel,
  SyncConnectionDocument,
  SyncConnectionModel,
} from '../models';
import { TriggerRegistry } from '@lib/core/entities/trigger';
import { TriggerDocument, TriggerModel } from '../models/trigger.model';
import { SyncflowDocument, SyncflowModel } from '../models/syncflow.model';
import { InjectTokens } from '@lib/modules/inject-tokens';
import { ISyncflowRepository } from '../../classes/repositories/syncflow.repository';

@Injectable()
export class SyncConnectionRepository implements ISyncConnectionRepository {
  private readonly logger = new Logger(SyncConnectionRepository.name);

  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(SyncConnectionModel.name)
    private syncConnectionModel: Model<SyncConnectionDocument>,
    @InjectModel(TriggerModel.name)
    private triggerModel: Model<TriggerDocument>,
    @InjectModel(SyncflowModel.name)
    private syncflowModel: Model<SyncflowDocument>,
    @InjectModel(DataSourceModel.name)
    private dataSourceModel: Model<DataSourceDocument>,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private syncflowRepository: ISyncflowRepository,
  ) {}

  public async getById(id: string, options?: QueryOptions) {
    const conditions = {
      _id: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.syncConnectionModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async getByDataSourceId(id: string, options?: QueryOptions) {
    const conditions = {
      sourceId: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.syncConnectionModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async create(data: CreateSyncConnectionData, options?: QueryOptions) {
    this.logger.debug(`create sync connection: `, data);
    let result;
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      // create syncflows
      const syncflowDocuments = await Promise.all(
        data.syncflows.map(async (syncflowData) => {
          const syncflowFromRegistry = SyncflowRegistry.get(syncflowData.name);
          const trigger = TriggerRegistry.get(syncflowData.trigger.name);
          const syncflow = new this.syncflowModel({
            name: syncflowFromRegistry.name,
            attributes: syncflowFromRegistry.attributes,
            sourceId: Utils.toObjectId(data.sourceId),
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
              id: Utils.toObjectId(syncflow.id),
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
        sourceId: Utils.toObjectId(data.sourceId),
        config: data.config,
        syncflows: syncflowDocuments.map((syncflow) => ({
          id: syncflow._id,
          name: syncflow.name,
          trigger: {
            id: triggerDocuments.find(
              (trigger) => trigger.workflow.id === syncflow._id,
            )?._id,
            name: syncflow.trigger.name,
            type: syncflow.trigger.type,
          },
          config: syncflow.config,
        })),
      });
      await syncConnection.save({ session });
      result = syncConnection.toJSON();
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
    return result;
  }

  public async update(data: UpdateSyncConnectionData, options?: QueryOptions) {
    let result;
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
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
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
    if (options?.new) {
      return result;
    }
  }

  public async delete(id: string, options?: QueryOptions) {
    let result;
    this.logger.debug(`delete sync connection: `, id);
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const syncConnection = await this.syncConnectionModel
        .findOne({
          _id: Utils.toObjectId(id),
        })
        .session(session);
      if (!syncConnection) {
        throw new Error('Sync connection not found');
      }
      // delete sync connection
      await syncConnection
        .updateOne({
          $set: {
            isDeleted: true,
          },
        })
        .session(session);
      // delete syncflows and triggers
      await Promise.all(
        syncConnection.syncflows.map(async (syncflow) => {
          const syncflowDoc = await this.syncflowModel
            .findOne({
              _id: syncflow.id,
            })
            .session(session);
          await syncflowDoc.updateOne({
            $set: {
              isDeleted: true,
            },
          });
          const triggerDoc = await this.triggerModel
            .findOne({
              'workflow.id': syncflow.id,
            })
            .session(session);
          await triggerDoc
            .updateOne({
              $set: {
                isDeleted: true,
              },
            })
            .session(session);
        }),
      );
      if (options?.old) {
        result = syncConnection.toJSON();
      }
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
    if (options?.old) {
      return result;
    }
  }
}
