import { Injectable } from '@nestjs/common';
import { DataSourceService } from '../data-source/data-source.service';
import { DataSourceId } from '@lib/core';

@Injectable()
export class DataSourceActivities {
  constructor(private readonly dataSourceService: DataSourceService) {}

  async deleteDataSource(id: DataSourceId) {
    return this.dataSourceService.delete(id);
  }

  async terminateDataSourceWorkflows(id: DataSourceId) {
    await this.dataSourceService.terminateDataSourceWorkflows(id);
  }
}
