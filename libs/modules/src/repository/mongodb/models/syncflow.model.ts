import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  DataSourceId,
  Syncflow,
  SyncflowAttributes,
  SyncflowConfig,
  SyncflowState,
} from '@lib/core';
import { TriggerName, TriggerType } from '@lib/core/entities/trigger';

export type SyncflowDocument = SyncflowModel & Document;

@Schema({
  timestamps: true,
  collection: 'syncflows',
  versionKey: false,
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

  @Prop()
  sourceId: DataSourceId;

  @Prop({
    type: Object,
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
}

export const SyncflowSchema = SchemaFactory.createForClass(SyncflowModel);

SyncflowSchema.virtual('id').get(function () {
    return this._id.toHexString(); // eslint-disable-line
});
