import { DataSource } from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataSourceDocument = DataSourceModel & Document;

@Schema({
  timestamps: true,
  collection: 'datasourcesList',
})
export class DataSourceModel extends DataSource {
  @Prop()
  externalId: string;
}

export const DataSourceSchema = SchemaFactory.createForClass(DataSourceModel);
