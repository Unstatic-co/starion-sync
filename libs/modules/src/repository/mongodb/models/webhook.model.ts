import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Webhook, WebhookStatus, WebhookType } from '@lib/core';

export type WebhookDocument = WebhookModel & Document;

@Schema({
  timestamps: true,
  collection: 'webhooks',
  versionKey: false,
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

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;
}

export const WebhookSchema = SchemaFactory.createForClass(WebhookModel);

WebhookSchema.virtual('id').get(function () {
    return this._id.toHexString(); // eslint-disable-line
});
