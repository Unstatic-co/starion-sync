export type MessagePayload = any;

export interface BaseMessage {
  createdAt: Date;
  updatedAt: Date;
  payload: MessagePayload;
}
