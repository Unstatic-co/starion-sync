import {
  GOOGLE_SHEETS_UPDATE_METADATA_FREQUENCY,
  GoogleSheetsUpdateMetadataJobData,
} from './../formsync/google-sheets/job';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  ExcelDataSource,
  GoogleSheetsDataSource,
} from 'src/entities';
import { Repository } from 'typeorm';
import { CreateExcelDataSourceDto } from './dto/createExcelDs.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { ExcelMetadataJob } from 'src/entities/excel';
import { Utils } from 'src/utils';
import {
  EXCEL_UPDATE_METADATA_FREQUENCY,
  ExcelUpdateMetadataJobData,
} from '../formsync/excel';
import { DataSource as DbDataSource } from 'typeorm';
import { CreateGoogleSheetsDataSourceDto } from './dto/createGoogleSheetsDs.dto';
import { GoogleSheetsMetadataJob } from 'src/entities/google-sheets';
import { ProviderType } from 'src/lib/provider';
import { CleanerFactory } from '../cleaner/cleaner.factory';
import {
  EXCEL_JOB_QUEUES,
  GOOGLE_SHEETS_JOB_QUEUES,
} from 'src/common/inject-tokens';

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);

  constructor(
    @InjectRepository(DataSource)
    private readonly dataSourceRepository: Repository<DataSource>,
    @InjectRepository(ExcelDataSource)
    private readonly excelDataSourceRepository: Repository<ExcelDataSource>,
    @InjectQueue(EXCEL_JOB_QUEUES.UPDATE_METADATA)
    private readonly excelUpdateMetadataQueue: Queue,
    @InjectQueue(GOOGLE_SHEETS_JOB_QUEUES.UPDATE_METADATA)
    private readonly googleSheetsUpdateMetadataQueue: Queue,
    private readonly dbDataSource: DbDataSource,
    private readonly cleanerFactory: CleanerFactory,
  ) {}

  async createExcelDataSource(data: CreateExcelDataSourceDto) {
    this.logger.log(`create excel data source ${data.dataSourceId}`);
    const { dataSourceId, workbookId, worksheetId, refreshToken } = data;

    const dataSource = new ExcelDataSource();
    dataSource.id = dataSourceId;
    dataSource.workbookId = workbookId;
    dataSource.worksheetId = worksheetId;
    dataSource.refreshToken = refreshToken;
    dataSource.timezone = data.timezone;
    // metadata job
    const metadataJob = {
      jobId: uuidv4(),
      cron: Utils.createCronExpressionFromFrequency(
        EXCEL_UPDATE_METADATA_FREQUENCY,
      ),
    } as ExcelMetadataJob;
    dataSource.metadataJob = metadataJob;

    const oDataSource = new DataSource();
    oDataSource.id = dataSourceId;
    oDataSource.provider = ProviderType.MicrosoftExcel;

    const queryRunner = this.dbDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(oDataSource);
      await queryRunner.manager.save(dataSource);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // await this.excelDataSourceRepository.save(dataSource);

    // add update metadata job
    this.logger.log(`add update metadata job for ${dataSourceId}`);
    await this.excelUpdateMetadataQueue.add(
      {
        dataSourceId,
      } as ExcelUpdateMetadataJobData,
      {
        jobId: metadataJob.jobId,
        attempts: 3,
        delay: 1000,
        repeat: {
          cron: metadataJob.cron,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async createGoogleSheetsDataSource(data: CreateGoogleSheetsDataSourceDto) {
    this.logger.log(`create ggsheets data source ${data.dataSourceId}`);
    const { dataSourceId, spreadsheetId, sheetId, refreshToken } = data;

    const dataSource = new GoogleSheetsDataSource();
    dataSource.id = dataSourceId;
    dataSource.spreadsheetId = spreadsheetId;
    dataSource.sheetId = sheetId;
    dataSource.refreshToken = refreshToken;
    // metadata job
    const metadataJob = {
      jobId: uuidv4(),
      cron: Utils.createCronExpressionFromFrequency(
        GOOGLE_SHEETS_UPDATE_METADATA_FREQUENCY,
      ),
    } as GoogleSheetsMetadataJob;
    dataSource.metadataJob = metadataJob;

    const oDataSource = new DataSource();
    oDataSource.id = dataSourceId;
    oDataSource.provider = ProviderType.GoogleSheets;

    const queryRunner = this.dbDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(oDataSource);
      await queryRunner.manager.save(dataSource);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // add update metadata job
    this.logger.log(`add update metadata job for ${dataSourceId}`);
    await this.googleSheetsUpdateMetadataQueue.add(
      {
        dataSourceId,
      } as GoogleSheetsUpdateMetadataJobData,
      {
        jobId: metadataJob.jobId,
        attempts: 3,
        delay: 1000,
        repeat: {
          cron: metadataJob.cron,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async deleteDataSource(dataSourceId: string) {
    this.logger.log(`delete data source ${dataSourceId}`);
    const dataSource = await this.dataSourceRepository.findOne({
      where: {
        id: dataSourceId,
      },
      select: ['id', 'provider'],
    });
    if (!dataSource) {
      this.logger.warn(`data source ${dataSourceId} not found`);
      return;
    }
    const cleaner = this.cleanerFactory.get(dataSource.provider);
    await cleaner.run(dataSourceId);
    await this.dataSourceRepository.delete({
      id: dataSourceId,
    });
  }

  async getSchema(dataSourceId: string) {
    const dataSource = await this.dataSourceRepository.findOne({
      where: {
        id: dataSourceId,
      },
      select: ['schema'],
    });
    return dataSource?.schema;
  }
}
