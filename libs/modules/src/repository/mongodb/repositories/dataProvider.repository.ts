import { Injectable } from '@nestjs/common';
import {
  CreateDataProviderData,
  IDataProviderRepository,
  UpdateDataProviderData,
} from '../../classes/repositories';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataProvider } from '@lib/core';
import { DataProviderDocument, DataProviderModel } from '../models';
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
  ) {}

  public async getById(id: string) {
    const dataProvider = await this.dataProviderModel.findOne({
      _id: Utils.toObjectId(id),
    });
    if (!dataProvider) return null;
    return dataProvider;
  }

  public async getByExternalId(externalId: string) {
    const dataProvider = await this.dataProviderModel.findOne({
      externalId,
    });
    if (!dataProvider) return null;
    return dataProvider;
  }

  public async create(arg: CreateDataProviderData): Promise<DataProvider> {
    const dataProvider = new this.dataProviderModel({
      ...arg,
    });
    await dataProvider.save();
    return dataProvider as unknown as DataProvider;
  }

  public async update(data: UpdateDataProviderData, options?: QueryOptions) {
    let result;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      const dataProvider = await this.dataProviderModel
        .findOne({
          _id: Utils.toObjectId(data.id),
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
        result = await this.dataProviderModel
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

  public async delete(id: string): Promise<void> {}
}
