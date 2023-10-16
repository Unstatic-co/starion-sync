import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ExcelCommonMetadataDocument,
  ExcelCommonMetadataModel,
  ExcelRowMetadataDocument,
  ExcelRowMetadataModel,
} from 'src/entities/excel';
import {
  GoogleSheetsCommonMetadataDocument,
  GoogleSheetsCommonMetadataModel,
  GoogleSheetsRowMetadataDocument,
  GoogleSheetsRowMetadataModel,
} from 'src/entities/google-sheets';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(
    @InjectModel(ExcelCommonMetadataModel.name)
    private readonly excelCommonMetadataModel: Model<ExcelCommonMetadataDocument>,
    @InjectModel(ExcelRowMetadataModel.name)
    private readonly excelRowMetadataModel: Model<ExcelRowMetadataDocument>,
    @InjectModel(GoogleSheetsCommonMetadataModel.name)
    private readonly googleSheetsCommonMetadataModel: Model<GoogleSheetsCommonMetadataDocument>,
    @InjectModel(GoogleSheetsRowMetadataModel.name)
    private readonly googleSheetsRowMetadataModel: Model<GoogleSheetsRowMetadataDocument>,
  ) {}

  async getExcelCommonMetadata(dataSourceId: string) {
    return this.excelCommonMetadataModel.findOne({ dataSourceId }).lean();
  }

  async getExcelRowCount(dataSourceId: string) {
    const metadata = await this.getExcelCommonMetadata(dataSourceId);
    return metadata?.rowCount;
  }

  async increaseExcelRowCount(dataSourceId: string) {
    await this.excelCommonMetadataModel.updateOne(
      { dataSourceId },
      { $inc: { rowCount: 1 } },
    );
  }

  async getExcelRowPos(rowId: string) {
    const rowMetadata = await this.excelRowMetadataModel
      .findOne({ _id: rowId })
      .select('pos')
      .lean();
    return rowMetadata?.pos;
  }

  async getExcelCTag(dataSourceId: string) {
    const excelCommon = await this.excelCommonMetadataModel
      .findOne({ dataSourceId })
      .select('cTag')
      .lean();
    return excelCommon?.cTag;
  }

  async updateExcelCTag(dataSourceId: string, cTag: string) {
    await this.excelCommonMetadataModel.findOneAndUpdate(
      { dataSourceId },
      {
        $set: { cTag },
      },
    );
  }

  async getGoogleSheetsCommonMetadata(dataSourceId: string) {
    return this.googleSheetsCommonMetadataModel
      .findOne({ dataSourceId })
      .lean();
  }

  async getGoogleSheetsRowCount(dataSourceId: string) {
    const metadata = await this.getGoogleSheetsCommonMetadata(dataSourceId);
    return metadata?.rowCount;
  }

  async increaseGoogleSheetsRowCount(dataSourceId: string) {
    await this.googleSheetsCommonMetadataModel.updateOne(
      { dataSourceId },
      { $inc: { rowCount: 1 } },
    );
  }

  async getGoogleSheetsRowPos(rowId: string) {
    const rowMetadata = await this.googleSheetsRowMetadataModel
      .findOne({ _id: rowId })
      .select('pos')
      .lean();
    return rowMetadata?.pos;
  }
}
