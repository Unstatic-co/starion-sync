import { Injectable, Logger } from '@nestjs/common';
import { Cleaner } from '../cleaner.factory';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleSheetsDataSource } from 'src/entities';
import { Repository } from 'typeorm';
import { GOOGLE_SHEETS_JOB_QUEUES } from 'src/common/inject-tokens';

@Injectable()
export class GoogleSheetsCleanerService implements Cleaner {
  private readonly logger = new Logger(GoogleSheetsCleanerService.name);

  constructor(
    @InjectQueue(GOOGLE_SHEETS_JOB_QUEUES.UPDATE_METADATA)
    private readonly updateMetadataQueue: Queue,
    @InjectRepository(GoogleSheetsDataSource)
    private readonly dataSourceRepository: Repository<GoogleSheetsDataSource>,
  ) {}

  async run(dataSourceId: string) {
    const dataSource = await this.dataSourceRepository.findOne({
      where: {
        id: dataSourceId,
      },
      select: ['id', 'metadataJob'],
    });
    if (!dataSource) {
      return;
    }
    await this.updateMetadataQueue.removeRepeatable({
      jobId: dataSource.metadataJob.jobId,
      cron: dataSource.metadataJob.cron,
    });
  }
}
