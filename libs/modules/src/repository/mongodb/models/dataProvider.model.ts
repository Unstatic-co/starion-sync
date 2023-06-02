import { DataProvider, ProviderConfig, ProviderType } from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataProviderDocument = DataProviderModel & Document;

@Schema({
  timestamps: true,
  collection: 'dataproviders',
})
export class DataProviderModel extends DataProvider {
  @Prop()
  id: string;

  @Prop()
  type: ProviderType;

  @Prop()
  config: ProviderConfig;

  @Prop({
    type: Object,
  })
  metadata: object;
}

export const DataProviderSchema =
  SchemaFactory.createForClass(DataProviderModel);
