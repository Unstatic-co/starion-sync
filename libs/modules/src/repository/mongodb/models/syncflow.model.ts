import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  DataSourceId,
  Syncflow,
  SyncflowAttributes,
  SyncflowConfig,
  SyncflowState,
  SyncflowStatus,
} from '@lib/core';
import { TriggerName, TriggerType } from '@lib/core/entities/trigger';
import mongoose from 'mongoose';

export type SyncflowDocument = SyncflowModel & Document;

@Schema({
  _id: false,
})
class SyncflowStateModel {
  @Prop()
  downloadedAt?: Date;

  @Prop()
  ingestedAt?: Date;

  @Prop()
  status: SyncflowStatus;

  @Prop()
  version: number;

  @Prop()
  prevVersion: number;
}

@Schema({
  timestamps: true,
  collection: 'syncflows',
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
export class SyncflowModel extends Syncflow {
  @Prop()
  name: string;

  @Prop({
    type: Object,
  })
  attributes: SyncflowAttributes;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
  })
  sourceId: DataSourceId;

  @Prop({
    type: SyncflowStateModel,
  })
  state: SyncflowState;

  @Prop({
    type: Object,
  })
  config: SyncflowConfig;

  @Prop({
    type: Object,
  })
  trigger: {
    name: TriggerName;
    type: TriggerType;
  };

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;
}

export const SyncflowSchema = SchemaFactory.createForClass(SyncflowModel);

SyncflowSchema.index({ sourceId: 1 }, { background: true });

SyncflowSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});
