import { Injectable } from '@nestjs/common';
import {
  CreateDataSourceData,
  IDataSourceRepository,
  UpdateDataSourceData,
} from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  DataSourceDocument,
  DataSourceModel,
} from '../models/dataSource.model';
import { Model } from 'mongoose';
import { DataSource, defaultDataSourceStatistics } from '@lib/core';
import { Utils } from 'apps/configurator/src/common/utils';
import { QueryOptions } from '../../classes';
import mongoose from 'mongoose';
import { mapKeys } from 'lodash';

@Injectable()
export class DataSourceRepository implements IDataSourceRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(DataSourceModel.name)
    private dataSourceModel: Model<DataSourceDocument>,
  ) {}

  public async getById(id: string, options?: QueryOptions) {
    const conditions = {
      _id: Utils.toObjectId(id),
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.dataSourceModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async getByExternalId(externalId: string, options?: QueryOptions) {
    const conditions = {
      externalId,
      isDeleted: false,
    };
    if (options?.includeDeleted) {
      Object.assign(conditions, { isDeleted: true });
    }
    let query = this.dataSourceModel.findOne(conditions);
    if (options?.session) {
      query = query.session(options.session);
    }
    const result = await query;
    if (!result) return null;
    return result.toJSON();
  }

  public async create(
    data: CreateDataSourceData,
    options?: QueryOptions,
  ): Promise<DataSource> {
    const dataSource = new this.dataSourceModel({
      ...data,
      provider: {
        id: Utils.toObjectId(data.providerId),
        type: data.providerType,
      },
      statistics: defaultDataSourceStatistics,
    });
    const query = options?.session
      ? dataSource.save({ session: options.session })
      : dataSource.save();
    await query;
    return dataSource.toJSON() as DataSource;
  }

  public async update(data: UpdateDataSourceData, options?: QueryOptions) {
    let result;
    const session = options?.session
      ? options.session
      : await this.connection.startSession();

    const processFunc = async () => {
      const dataSource = await this.dataSourceModel
        .findOne({
          _id: Utils.toObjectId(data.id),
        })
        .session(session);
      if (!dataSource) {
        throw new Error('DataSource not found');
      }
      const updates = {};
      data.metadata &&
        Object.assign(
          updates,
          mapKeys(data.metadata, (_, key) => `metadata.${key}`),
        );
      await dataSource
        .updateOne({
          $set: updates,
        })
        .session(session);
      if (options?.new) {
        result = (
          await this.dataSourceModel
            .findOne({
              _id: Utils.toObjectId(data.id),
            })
            .session(session)
        ).toJSON();
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
      const dataSource = await this.dataSourceModel
        .findOne({
          _id: Utils.toObjectId(id),
          isDeleted: false,
        })
        .session(session);
      if (!dataSource) {
        throw new Error('DataSource not found');
      }
      await dataSource
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
