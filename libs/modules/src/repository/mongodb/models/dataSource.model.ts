import {
  DataSource,
  DataSourceConfig,
  DataSourceLimitation,
  DataSourceStatistics,
  Metadata,
  ProviderType,
} from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataSourceDocument = DataSourceModel & Document;

@Schema({
  timestamps: true,
  collection: 'datasources',
  versionKey: false,
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      // ret.id = ret._id.toString(); // eslint-disable-line
      delete ret._id; // eslint-disable-line
      if (ret.provider?.id) {
        ret.provider.id = ret.provider.id.toString(); // eslint-disable-line
      }
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
  config: DataSourceConfig;

  @Prop({ type: Object })
  statistics: DataSourceStatistics;

  @Prop({ type: Object })
  limits: DataSourceLimitation;

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

export const DataSourceSchema = SchemaFactory.createForClass(DataSourceModel);

DataSourceSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});
