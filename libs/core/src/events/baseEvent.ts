export type EventName = string;
export interface EventPayload {
  [key: string]: any;
}

export class BaseEvent {
  name: EventName;
  payload: EventPayload;

  time?: Date;
}
