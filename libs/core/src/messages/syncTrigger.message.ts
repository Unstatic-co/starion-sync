import { DataSourceId } from '../entities';
import { BaseMessage } from './message.entity';

export interface SyncTriggerMessage extends BaseMessage {
  sourceId: DataSourceId;
  destinationId: DataSourceId;
}
