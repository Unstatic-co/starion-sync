import { Injectable } from '@nestjs/common';
import { DataProviderService } from '../data-provider/data-provider.service';
import { DataSourceService } from '../data-source/data-source.service';
import { SyncConnectionService } from '../sync-connection/syncConection.service';
import { CommonService } from '../common/common.service';

@Injectable()
export class CommonActivities {
  constructor(
    private readonly dataSourceService: DataSourceService,
    private readonly syncConnectionService: SyncConnectionService,
    private readonly commonService: CommonService,
  ) {}

  async createDataSource(arg: any) {
    return this.dataSourceService.create(arg);
  }

  async createSyncConnection(arg: any) {
    return this.syncConnectionService.create(arg);
  }
}
