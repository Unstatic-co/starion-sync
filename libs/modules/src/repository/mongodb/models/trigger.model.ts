import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  Trigger,
  TriggerConfig,
  TriggerType,
} from '@lib/core/entities/trigger';
import { WorkflowId, WorkflowName } from '@lib/core';

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
  };

  @Prop()
  type: TriggerType;

  @Prop({
    type: Object,
  })
  config: TriggerConfig;
}

export const TriggerSchema = SchemaFactory.createForClass(TriggerModel);

TriggerSchema.virtual('id').get(function () {
    return this._id.toHexString(); // eslint-disable-line
});
