import { Injectable } from '@nestjs/common';
import {
  CreateDataProviderData,
  IDataProviderRepository,
  UpdateDataProviderData,
} from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataProvider, ProviderId, ProviderState } from '@lib/core';
import {
  DataProviderDocument,
  DataProviderModel,
  DataSourceDocument,
  DataSourceModel,
} from '../models';
import { Utils } from 'apps/configurator/src/common/utils';
import mongoose from 'mongoose';
import { QueryOptions } from '../../classes/common';
import { mapKeys } from 'lodash';

@Injectable()
export class DataProviderRepository implements IDataProviderRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(DataProviderModel.name)
    private readonly dataProviderModel: Model<DataProviderDocument>,
    @InjectModel(DataSourceModel.name)
    private readonly dataSourceModel: Model<DataSourceDocument>,
  ) {}

  public async getById(id: string, options?: QueryOptions) {
    const conditions = {
      _id: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      delete conditions.isDeleted;
    }
    const query = options?.session
      ? this.dataProviderModel.findOne(conditions).session(options.session)
      : this.dataProviderModel.findOne(conditions);
    const result = await query;
    if (!result) return null;
    return result.toObject();
  }

  public async getByExternalId(externalId: string, options?: QueryOptions) {
    const conditions = {
      externalId,
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      delete conditions.isDeleted;
    }
    const query = options?.session
      ? this.dataProviderModel.findOne(conditions).session(options.session)
      : this.dataProviderModel.findOne(conditions);
    const result = await query;
    if (!result) return null;
    return result.toObject();
  }

  public async create(
    arg: CreateDataProviderData,
    options?: QueryOptions,
  ): Promise<{
    data: DataProvider | null;
    isExist: boolean;
  }> {
    const dataProvider = new this.dataProviderModel({
      ...arg,
    });
    try {
      const query = options?.session
        ? dataProvider.save({ session: options.session })
        : dataProvider.save();
      await query;
      return { data: dataProvider.toObject() as DataProvider, isExist: false };
    } catch (error) {
      if (error.code === 11000) {
        return { data: null, isExist: true };
      }
    }
  }

  public async update(data: UpdateDataProviderData, options?: QueryOptions) {
    let result;
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const dataProvider = await this.dataProviderModel
        .findOne({
          _id: Utils.toObjectId(data.id),
          isDeleted: false,
        })
        .session(session);
      if (!dataProvider) {
        throw new Error('DataProvider not found');
      }
      const updates = {};
      data.auth && Object.assign(updates, { 'config.auth': data.auth });
      data.metadata &&
        Object.assign(
          updates,
          mapKeys(data.metadata, (_, key) => `metadata.${key}`),
        );
      await dataProvider
        .updateOne({
          $set: updates,
        })
        .session(session);
      if (options?.new) {
        result = (
          await this.dataProviderModel
            .findOne({
              _id: Utils.toObjectId(data.id),
            })
            .session(session)
        ).toObject();
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

  public async updateState(
    id: ProviderId,
    state: Partial<ProviderState>,
    options?: QueryOptions,
  ) {
    let result;
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const dataProvider = await this.dataProviderModel
        .findOne({
          _id: Utils.toObjectId(id),
          isDeleted: false,
        })
        .session(session);
      if (!dataProvider) {
        throw new Error('DataProvider not found');
      }
      const updates = {};
      Object.assign(
        updates,
        mapKeys(state, (_, key) => `state.${key}`),
      );
      await dataProvider
        .updateOne({
          $set: updates,
        })
        .session(session);
      if (options?.new) {
        result = (
          await this.dataProviderModel
            .findOne({
              _id: Utils.toObjectId(id),
            })
            .session(session)
        ).toObject();
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

  public async delete(id: string, options?: QueryOptions): Promise<void> {
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const dataProvider = await this.dataProviderModel
        .findOne({
          _id: Utils.toObjectId(id),
          isDeleted: false,
        })
        .session(session);
      if (!dataProvider) {
        throw new Error('Data Provider not found');
      }
      await dataProvider.updateOne(
        {
          $set: {
            isDeleted: true,
          },
        },
        {
          session,
        },
      );
      await this.dataSourceModel.updateMany(
        {
          'provider.id': Utils.toObjectId(id),
        },
        {
          $set: {
            isDeleted: true,
          },
        },
        {
          session,
        },
      );
    };

    if (options?.session) {
      await processFunc();
    } else {
      await session.withTransaction(processFunc);
    }
  }
}
