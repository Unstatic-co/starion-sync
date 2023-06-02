import { Injectable } from '@nestjs/common';
import {
  CreateDataProviderArgs,
  IDataProviderRepository,
} from '../../classes/repositories';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataProvider } from '@lib/core';
import { DataProviderDocument, DataProviderModel } from '../models';

@Injectable()
export class DataProviderRepository implements IDataProviderRepository {
  constructor(
    @InjectModel(DataProviderModel.name)
    private dataProviderModel: Model<DataProviderDocument>,
  ) {}

  public async getById(id: string): Promise<DataProvider> {
    return {} as any;
  }

  public async create(arg: CreateDataProviderArgs): Promise<DataProvider> {
    const dataProvider = new this.dataProviderModel({
      ...arg,
    });
    await dataProvider.save();
    return dataProvider as unknown as DataProvider;
  }

  public async delete(id: string): Promise<void> {}
}
