import { Operation, OperationName } from '@lib/core';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IdempotencyDocument = IdempotencyModel & Document;

@Schema({
  timestamps: true,
  collection: 'dataproviders',
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id; // eslint-disable-line
      return ret;
    },
  },
})
export class IdempotencyModel extends Operation {
  @Prop()
  name: OperationName;
}

export const IdempotencySchema = SchemaFactory.createForClass(IdempotencyModel);

IdempotencySchema.virtual('id').get(function () {
  return this._id.toHexString(); // eslint-disable-line
});

IdempotencySchema.index({ name: 1 }, { background: true });
