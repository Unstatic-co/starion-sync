import { Inject, Injectable } from '@nestjs/common';
import { SyncConnectionService } from '../sync-connection/syncConection.service';
import { CommonService } from '../common/common.service';

@Injectable()
export class SyncConnectionActivities {
  constructor(private readonly syncConnectionService: SyncConnectionService) {}

  async createSyncConnection(arg: any) {
    return this.syncConnectionService.create(arg);
  }
}
