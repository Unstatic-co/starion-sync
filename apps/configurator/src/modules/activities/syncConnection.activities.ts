import { Injectable } from '@nestjs/common';
import { SyncConnectionService } from '../sync-connection/syncConection.service';
import { TriggerService } from '../trigger/trigger.service';

@Injectable()
export class SyncConnectionActivities {
  constructor(private readonly syncConnectionService: SyncConnectionService) {}

  async createSyncConnection(arg: any) {
    return this.syncConnectionService.create(arg);
  }

  async deleteSyncConnection(arg: any) {
    return this.syncConnectionService.delete(arg);
  }
}
