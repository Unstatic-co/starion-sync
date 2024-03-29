import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  Metadata,
  Webhook,
  WebhookScope,
  WebhookStatus,
  WebhookType,
} from '@lib/core';

export type WebhookDocument = WebhookModel & Document;

@Schema({
  timestamps: true,
  collection: 'webhooks',
  versionKey: false,
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      // ret.id = ret._id.toString(); // eslint-disable-line
      delete ret._id; // eslint-disable-line
      // ret.dataSourceId = ret.dataSourceId.toString(); // eslint-disable-line
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
export class WebhookModel extends Webhook {
  @Prop()
  status: WebhookStatus;

  @Prop()
  url: string;

  @Prop()
  type: WebhookType;

  @Prop({ default: false })
  assure: boolean;

  @Prop({ default: WebhookScope.GLOBAL })
  scope: WebhookScope;

  @Prop()
  dataSourceId?: string;

  @Prop({
    type: Object,
  })
  metadata?: Metadata;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;
}

export const WebhookSchema = SchemaFactory.createForClass(WebhookModel);

WebhookSchema.index({ dataSourceId: 1 }, { background: true });

WebhookSchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});
