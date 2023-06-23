import {
  DataSource,
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
  statistic: DataSourceStatistics;

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
