import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConfigDocument = Config & Document;

@Schema({
  timestamps: false,
})
export class Config {}

export const ConfigSchema = SchemaFactory.createForClass(Config);
