export type EventName = string;
export type EventPayload = any;

export class Event {
  name: EventName;
  payload: EventPayload;

  createdAt: Date;
  updatedAt: Date;
}
