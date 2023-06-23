import { SyncConnection } from '../entities';
import { EventPayload } from './baseEvent';

export type ConnectionCreatedPayload = EventPayload & SyncConnection;
export type ConnectionDeletedPayload = EventPayload & SyncConnection;
