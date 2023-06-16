import {
  SyncConnection,
  SyncConnectionState,
  SyncConnectionConfig,
  Syncflow,
} from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DataProviderSchema } from './dataProvider.model';

export type SyncConnectionDocument = SyncConnectionModel & Document;

@Schema({
  timestamps: true,
  collection: 'syncconnections',
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id; // eslint-disable-line
      return ret;
    },
  },
})
export class SyncConnectionModel extends SyncConnection {
  @Prop({
    type: Object,
  })
  state: SyncConnectionState;

  @Prop({
    type: Object,
  })
  config: SyncConnectionConfig;

  @Prop({
    type: Array,
  })
  syncflows: Array<Partial<Syncflow>>;
}

export const SyncConnectionSchema =
  SchemaFactory.createForClass(SyncConnectionModel);

SyncConnectionSchema.virtual('id').get(function () {
    return this._id.toHexString(); // eslint-disable-line
});
