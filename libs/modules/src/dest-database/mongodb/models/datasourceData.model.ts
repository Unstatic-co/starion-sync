import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataSourceDataDocument = DataSourceDataModel & Document;

@Schema({
  timestamps: true,
  collection: 'datasourceDatas',
})
export class DataSourceDataModel {
  @Prop()
  dataSourceId: string;
}

export const DataSourceDataSchema =
  SchemaFactory.createForClass(DataSourceDataModel);
