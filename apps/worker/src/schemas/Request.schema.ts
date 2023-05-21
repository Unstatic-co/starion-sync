import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import * as paginate from 'mongoose-paginate-v2';
import { Media } from './common.schema';
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');

export type RequestDocument = Request & Document;

export enum RequestStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  FINISHED = 'finished',
  REJECTED = 'rejected',
}

export class Assignee {
  @Prop({ type: Types.ObjectId, ref: 'NFT' })
  id: Types.ObjectId;

  @Prop()
  email: string;
}

@Schema({
  timestamps: true,
})
export class Request {
  @Prop()
  index: string;

  @Prop({ default: RequestStatus.DRAFT })
  status: RequestStatus;

  @Prop()
  name: string;

  @Prop()
  studentCode: string;

  @Prop()
  email: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  layout: number;

  @Prop([{ type: Media }])
  videos: Media[];

  @Prop({ type: Media })
  fileTranscript: Media;

  @Prop()
  transcript: string;

  @Prop({ type: Assignee })
  assignee: Assignee;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const RequestSchema = SchemaFactory.createForClass(Request);
RequestSchema.plugin(paginate);
RequestSchema.plugin(aggregatePaginate);
