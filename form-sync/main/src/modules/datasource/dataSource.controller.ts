import { Body, Controller, Param, Post } from '@nestjs/common';
import { DataSourceService } from './dataSource.service';
import { CreateExcelDataSourceDto } from './dto/createExcelDs.dto';
import { ExcelFormSyncService } from '../formsync/excel';
import { CreateGoogleSheetsDataSourceDto } from './dto/createGoogleSheetsDs.dto';
import { GoogleSheetsFormSyncService } from '../formsync/google-sheets';

@Controller('datasources')
export class DataSourceController {
  constructor(
    private readonly dataSourceService: DataSourceService,
    private readonly excelFormsyncService: ExcelFormSyncService,
    private readonly googleSheetsFormsyncService: GoogleSheetsFormSyncService,
  ) {}

  @Post('excel')
  async createExcelDataSource(@Body() data: CreateExcelDataSourceDto) {
    return this.dataSourceService.createExcelDataSource(data);
  }

  @Post('excel/:id/metadata/update')
  async updateExcelDataSourceMetadata(@Param('id') id: string) {
    return this.excelFormsyncService.updateMetadata(id);
  }

  @Post('google-sheets')
  async createGoogleSheetsDataSource(
    @Body() data: CreateGoogleSheetsDataSourceDto,
  ) {
    return this.dataSourceService.createGoogleSheetsDataSource(data);
  }

  @Post('google-sheets/:id/metadata/update')
  async updateGoogleSheetsDataSourceMetadata(@Param('id') id: string) {
    return this.googleSheetsFormsyncService.updateMetadata(id);
  }
}
