import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoogleSheetsCommonMetadataDocument =
  GoogleSheetsCommonMetadataModel & Document;

@Schema({
  timestamps: false,
  collection: 'google-sheets-common',
  versionKey: false,
})
export class GoogleSheetsCommonMetadataModel {
  @Prop({ index: true })
  dataSourceId: string;

  @Prop()
  rowCount: number;
}

export const GoogleSheetsCommonMetadataSchema = SchemaFactory.createForClass(
  GoogleSheetsCommonMetadataModel,
);

GoogleSheetsCommonMetadataSchema.index(
  { dataSourceId: 1 },
  { unique: true, background: true },
);

// ########################################################################

export type GoogleSheetsRowMetadataDocument = GoogleSheetsRowMetadataModel &
  Document;

@Schema({
  timestamps: false,
  collection: 'google-sheets-row-pos',
  versionKey: false,
})
export class GoogleSheetsRowMetadataModel {
  @Prop()
  _id: string;

  @Prop()
  dataSourceId: string;

  @Prop()
  pos: number;
}

export const GoogleSheetsRowMetadataSchema = SchemaFactory.createForClass(
  GoogleSheetsRowMetadataModel,
);

GoogleSheetsRowMetadataSchema.index({ dataSourceId: 1 }, { background: true });
