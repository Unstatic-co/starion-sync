import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ExcelCommonMetadataModel,
  ExcelCommonMetadataSchema,
  ExcelRowMetadataModel,
  ExcelRowMetadataSchema,
} from 'src/entities/excel';
import {
  GoogleSheetsCommonMetadataModel,
  GoogleSheetsCommonMetadataSchema,
  GoogleSheetsRowMetadataModel,
  GoogleSheetsRowMetadataSchema,
} from 'src/entities/google-sheets';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ExcelCommonMetadataModel.name,
        schema: ExcelCommonMetadataSchema,
      },
      {
        name: ExcelRowMetadataModel.name,
        schema: ExcelRowMetadataSchema,
      },
      {
        name: GoogleSheetsCommonMetadataModel.name,
        schema: GoogleSheetsCommonMetadataSchema,
      },
      {
        name: GoogleSheetsRowMetadataModel.name,
        schema: GoogleSheetsRowMetadataSchema,
      },
    ]),
  ],
  controllers: [],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
