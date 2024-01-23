import {
  SyncConnection,
  SyncConnectionState,
  SyncConnectionConfig,
  Syncflow,
  DataSourceId,
} from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

export type SyncConnectionDocument = SyncConnectionModel & Document;

@Schema({
  timestamps: true,
  collection: 'syncconnections',
  versionKey: false,
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      // ret.id = ret._id.toString(); // eslint-disable-line
      delete ret._id; // eslint-disable-line
      if (ret.sourceId) {
        ret.sourceId = ret.sourceId.toString(); // eslint-disable-line
      }
      if (ret.syncflows) {
        ret.syncflows = ret.syncflows.map((syncflow) => {
          syncflow.id = syncflow.id.toString(); // eslint-disable-line
          return syncflow;
        });
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
export class SyncConnectionModel extends SyncConnection {
  @Prop({
    type: Object,
  })
  state: SyncConnectionState;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
  })
  sourceId: DataSourceId;

  @Prop({
    type: Object,
  })
  config: SyncConnectionConfig;

  @Prop({
    type: Array,
  })
  syncflows: Array<Partial<Syncflow>>;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;
}

export const SyncConnectionSchema =
  SchemaFactory.createForClass(SyncConnectionModel);

SyncConnectionSchema.index({ sourceId: 1 }, { background: true });

SyncConnectionSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});
