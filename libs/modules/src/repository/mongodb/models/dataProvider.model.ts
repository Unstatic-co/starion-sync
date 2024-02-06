import {
  DataProvider,
  Metadata,
  ProviderConfig,
  ProviderState,
  ProviderType,
} from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataProviderDocument = DataProviderModel & Document;

@Schema({
  _id: false,
})
class DataProviderStateModel {
  @Prop()
  downloadedAt?: Date;
}

@Schema({
  timestamps: true,
  collection: 'dataproviders',
  versionKey: false,
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      // ret.id = ret._id.toString(); // eslint-disable-line
      delete ret._id; // eslint-disable-line
      return ret;
    },
  },
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
    type: DataProviderStateModel,
  })
  state: ProviderState;

  @Prop({
    type: Object,
  })
  metadata: Metadata;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;
}

export const DataProviderSchema =
  SchemaFactory.createForClass(DataProviderModel);

DataProviderSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});
