import { Injectable } from '@nestjs/common';
import { IDataSourceRepository } from '../../classes/repositories';
import { InjectModel } from '@nestjs/mongoose';
import {
  DataSourceDocument,
  DataSourceModel,
} from '../models/datasource.model';
import { Model } from 'mongoose';
import { DataSource } from '../../../entities/dataSource.entity';

@Injectable()
export class DataSourceRepository implements IDataSourceRepository {
  constructor(
    @InjectModel(DataSourceModel.name)
    private dataSourceModel: Model<DataSourceDocument>,
  ) {}

  public async getById(id: string): Promise<DataSource> {
    return {} as any;
  }

  public async create(): Promise<DataSource> {
    const dataSource = new this.dataSourceModel({
      id: '1',
    });
    await dataSource.save();
    return dataSource as unknown as DataSource;
  }
}
