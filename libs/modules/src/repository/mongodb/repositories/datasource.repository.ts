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

  public async getById(id: string) {
    const dataProvider = await this.dataSourceModel.findOne({
      _id: Utils.toObjectId(id),
    });
    if (!dataProvider) return null;
    return dataProvider.toJSON();
  }

  public async getByExternalId(externalId: string) {
    const dataProvider = await this.dataSourceModel.findOne({
      externalId,
    });
    if (!dataProvider) return null;
    return dataProvider.toJSON();
  }

  public async create(data: CreateDataSourceData): Promise<DataSource> {
    const dataSource = new this.dataSourceModel({
      ...data,
      provider: {
        id: Utils.toObjectId(data.providerId),
        type: data.providerType,
      },
      statistic: defaultDataSourceStatistics,
    });
    await dataSource.save();
    return dataSource.toJSON() as DataSource;
  }

  public async update(data: UpdateDataSourceData, options?: QueryOptions) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
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
    });
    if (options?.new) {
      return result;
    }
  }

  public async delete(): Promise<void> {}
}
