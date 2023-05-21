import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

export enum CounterName {
  REQUEST = 'request',
}
@Schema({
  timestamps: true,
})
export class Counter {
  @Prop({ unique: true })
  name: string;

  @Prop({ default: 1 })
  index: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
