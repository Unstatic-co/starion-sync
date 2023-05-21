import { Prop } from '@nestjs/mongoose';

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  THREE_D = '3d',
}

export class Media {
  @Prop()
  url: string;

  @Prop()
  type: MediaType;

  @Prop()
  mimeType: string;
}
