import { SyncConnection, Workflow } from '../entities';
import { Trigger } from '../entities/trigger';
import { EventPayload } from './baseEvent';

export type ConnectionCreatedPayload = EventPayload & SyncConnection;
export type ConnectionDeletedPayload = EventPayload & SyncConnection;
export type WorkflowTriggeredPayload = EventPayload & Trigger;
export type WorkflowScheduledPayload = EventPayload & Workflow;
