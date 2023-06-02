import { BaseMessage } from './message.entity';

export interface SyncTriggerMessage extends BaseMessage {
  sourceId: string;
  destinationId: string;
}
