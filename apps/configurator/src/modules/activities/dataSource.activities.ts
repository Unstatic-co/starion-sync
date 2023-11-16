import { Injectable } from '@nestjs/common';
import { DataSourceService } from '../data-source/data-source.service';
import { DataSource, DataSourceId } from '@lib/core';

@Injectable()
export class DataSourceActivities {
  constructor(private readonly dataSourceService: DataSourceService) {}

  async deleteDataSource(id: DataSourceId) {
    return this.dataSourceService.delete(id);
  }

  async deleteDataSourceData(dataSource: DataSource) {
    return this.dataSourceService.deleteData(dataSource);
  }

  async terminateDataSourceWorkflows(id: DataSourceId) {
    await this.dataSourceService.terminateDataSourceWorkflows(id);
  }
}
