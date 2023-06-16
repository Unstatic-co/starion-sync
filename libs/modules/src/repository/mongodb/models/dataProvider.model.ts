import {
  DataProvider,
  Metadata,
  ProviderConfig,
  ProviderType,
} from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataProviderDocument = DataProviderModel & Document;

@Schema({
  timestamps: true,
  collection: 'dataproviders',
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id; // eslint-disable-line
      return ret;
    },
  },
})
export class DataProviderModel extends DataProvider {
  @Prop()
  externalId: string;

  @Prop()
  type: ProviderType;

  @Prop({ type: Object })
  config: ProviderConfig;

  @Prop({
    type: Object,
  })
  metadata: Metadata;
}

export const DataProviderSchema =
  SchemaFactory.createForClass(DataProviderModel);

DataProviderSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});
