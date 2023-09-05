import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  Trigger,
  TriggerConfig,
  TriggerType,
} from '@lib/core/entities/trigger';
import {
  DataSourceId,
  WorkflowId,
  WorkflowName,
  WorkflowType,
} from '@lib/core';
import mongoose from 'mongoose';

export type TriggerDocument = TriggerModel & Document;

@Schema({
  timestamps: true,
  collection: 'triggers',
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id; // eslint-disable-line
      return ret;
    },
  },
})
export class TriggerModel extends Trigger {
  @Prop()
  name: string;

  @Prop({
    type: Object,
  })
  workflow: {
    id: WorkflowId;
    name: WorkflowName;
    type: WorkflowType;
  };

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
  })
  sourceId: DataSourceId;

  @Prop()
  type: TriggerType;

  @Prop({
    type: Object,
  })
  config: TriggerConfig;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;
}

export const TriggerSchema = SchemaFactory.createForClass(TriggerModel);

TriggerSchema.virtual('id').get(function () {
    return this._id.toHexString(); // eslint-disable-line
});
