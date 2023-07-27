import { Injectable } from '@nestjs/common';
import { activityWrapper } from './wrapper';
import { DataSourceService } from '../datasource/datasource.service';

@Injectable()
export class DataSourceActivities {
  constructor(private readonly dataSourceService: DataSourceService) {}

  async checkDataSourceLimitation(arg: any) {
    return activityWrapper(() => this.dataSourceService.checkLimitation(arg));
  }
}
