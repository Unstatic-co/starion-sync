import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DataSource } from '../../../entities/dataSource.entity';

export type DataSourceDocument = DataSourceModel & Document;

@Schema({
  timestamps: true,
  collection: 'datasources',
})
export class DataSourceModel extends DataSource {
  @Prop()
  id: string;
}

export const DataSourceSchema = SchemaFactory.createForClass(DataSourceModel);
