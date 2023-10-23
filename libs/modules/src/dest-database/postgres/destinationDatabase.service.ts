import { Injectable, Logger } from '@nestjs/common';
import { connectionName } from '../constants';
import { InjectDataSource, InjectEntityManager } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { IDestinationDatabaseService } from '../destinationDatabase.service';
import { DataSourceId } from '@lib/core';

@Injectable()
export class DestinationDatabaseService implements IDestinationDatabaseService {
  private readonly logger = new Logger(DestinationDatabaseService.name);

  constructor(
    @InjectDataSource(connectionName)
    private dataSource: DataSource,
    @InjectEntityManager(connectionName)
    private entityManager: EntityManager,
  ) {}

  async test() {
    this.logger.log(`Testing connection to ${connectionName}`);
    await this.dataSource.query('SELECT 1');
    this.logger.log(`Successfully connected to ${connectionName}`);
  }

  async getSchema(id: DataSourceId) {
    const schema = await this.entityManager.query(
      `SELECT sf.hash_name as id, name, type, origin_type as originalType, nullable, enum, readonly, is_primary as primary FROM schema_fields sf JOIN schemas s ON sf.schema_id = s.id WHERE s.data_source_id = '${id}'`,
    );
    return schema;
  }

  async getData(dataTableName: string) {
    const data = await this.entityManager
      .query(`SELECT data FROM "${dataTableName}"`)
      .then((res) => res.map((r) => r.data));
    return data;
  }
}
