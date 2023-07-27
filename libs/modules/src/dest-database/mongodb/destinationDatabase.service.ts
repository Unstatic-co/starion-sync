import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { connectionName } from '../constants';
import { DestinationDatabaseService as IDestinationDatabaseService } from '../destinationDatabase.service';
import { DataSourceDataModel, DataSourceModel } from './models';

@Injectable()
export class DestinationDatabaseService implements IDestinationDatabaseService {
  private readonly logger = new Logger(DestinationDatabaseService.name);

  constructor(
    @InjectConnection(connectionName) private readonly connection: Connection,
    @InjectModel(DataSourceModel.name)
    private readonly dataSourceModel: DataSourceModel,
    @InjectModel(DataSourceDataModel.name)
    private readonly dataSourceDataModel: DataSourceDataModel,
  ) {}

  async test() {
    const client = await this.connection.getClient();
    const db = client.db();
    db.collection('test').insertOne({ test: 'test' });
  }
}
