import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExcelCommonMetadataDocument = ExcelCommonMetadataModel & Document;

@Schema({
  timestamps: false,
  collection: 'excel-common',
  versionKey: false,
})
export class ExcelCommonMetadataModel {
  @Prop({ index: true })
  dataSourceId: string;

  @Prop()
  rowCount: number;

  @Prop()
  cTag: string;
}

export const ExcelCommonMetadataSchema = SchemaFactory.createForClass(
  ExcelCommonMetadataModel,
);

ExcelCommonMetadataSchema.index(
  { dataSourceId: 1 },
  { unique: true, background: true },
);

// ########################################################################

export type ExcelRowMetadataDocument = ExcelRowMetadataModel & Document;

@Schema({
  timestamps: false,
  collection: 'excel-row-pos',
  versionKey: false,
})
export class ExcelRowMetadataModel {
  @Prop()
  _id: string;

  @Prop()
  dataSourceId: string;

  @Prop()
  pos: number;
}

export const ExcelRowMetadataSchema = SchemaFactory.createForClass(
  ExcelRowMetadataModel,
);

ExcelCommonMetadataSchema.index({ dataSourceId: 1 }, { background: true });
