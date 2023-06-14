import {
  DataSource,
  DataSourceStatistic,
  Metadata,
  ProviderType,
} from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DataProviderSchema } from './dataProvider.model';

export type DataSourceDocument = DataSourceModel & Document;

@Schema({
  timestamps: true,
  collection: 'datasources',
})
export class DataSourceModel extends DataSource {
  @Prop()
  externalId: string;

  @Prop()
  externalLocalId: string;

  @Prop()
  name?: string;

  @Prop({ type: Object })
  provider: {
    id: string;
    type: ProviderType;
  };

  @Prop({ type: Object })
  statistic: DataSourceStatistic;

  @Prop({
    type: Object,
  })
  metadata: Metadata;
}

export const DataSourceSchema = SchemaFactory.createForClass(DataSourceModel);

DataSourceSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});

DataProviderSchema.set('toJSON', {
  virtuals: true,
});
