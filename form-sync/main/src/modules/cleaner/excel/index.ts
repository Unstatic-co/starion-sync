import { Injectable, Logger } from '@nestjs/common';
import { Cleaner } from '../cleaner.factory';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { ExcelDataSource } from 'src/entities';
import { Repository } from 'typeorm';
import { EXCEL_JOB_QUEUES } from 'src/common/inject-tokens';

@Injectable()
export class ExcelCleanerService implements Cleaner {
  private readonly logger = new Logger(ExcelCleanerService.name);

  constructor(
    @InjectQueue(EXCEL_JOB_QUEUES.UPDATE_METADATA)
    private readonly updateMetadataQueue: Queue,
    @InjectRepository(ExcelDataSource)
    private readonly dataSourceRepository: Repository<ExcelDataSource>,
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
