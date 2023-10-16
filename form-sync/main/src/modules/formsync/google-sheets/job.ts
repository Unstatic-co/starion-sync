import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DelayedFormSync, FormSync } from 'src/entities';
import { Repository } from 'typeorm';
import { GoogleSheetsFormSyncService } from '.';
import { GOOGLE_SHEETS_JOB_QUEUES } from 'src/common/inject-tokens';

export type GoogleSheetsUpdateMetadataJobData = {
  dataSourceId: string;
};
export type GoogleSheetsDelayedFormsyncJobData = {
  formsyncId: string;
};

export const GOOGLE_SHEETS_UPDATE_METADATA_FREQUENCY = 4; // minutes

@Processor(GOOGLE_SHEETS_JOB_QUEUES.UPDATE_METADATA)
@Injectable()
export class GoogleSheetsUpdateMetadataProcessor {
  private readonly logger = new Logger(
    GoogleSheetsUpdateMetadataProcessor.name,
  );

  constructor(
    @InjectQueue(GOOGLE_SHEETS_JOB_QUEUES.FORM_SYNC_RESPECT_METADATA)
    private readonly googleSheetsDelayedFormsyncQueue: Queue,
    @InjectRepository(DelayedFormSync)
    private delayedFormsyncRepository: Repository<DelayedFormSync>,
    private readonly formSyncService: GoogleSheetsFormSyncService,
  ) {}

  @Process()
  async process(job: Job<GoogleSheetsUpdateMetadataJobData>) {
    this.logger.log('process googleSheets update metadata', job.data);

    try {
      await this.formSyncService.updateMetadata(job.data.dataSourceId);

      // add delayed formsync jobs
      const delayedFormsyncs = await this.delayedFormsyncRepository.find({
        relations: {
          formsync: true,
        },
        where: {
          formsync: {
            dataSourceId: job.data.dataSourceId,
          },
        },
      });
      await Promise.all(
        delayedFormsyncs.map(async (delayedFormsync) => {
          await this.googleSheetsDelayedFormsyncQueue.add(
            {
              formsyncId: delayedFormsync.formsync.id,
            } as GoogleSheetsDelayedFormsyncJobData,
            {
              jobId: delayedFormsync.formsync.id,
            },
          );
        }),
      );
    } catch (error) {
      this.logger.warn(`error processing googleSheets update metadata`, error);
      throw error;
    }
  }
}

@Processor(GOOGLE_SHEETS_JOB_QUEUES.FORM_SYNC_RESPECT_METADATA)
@Injectable()
export class GoogleSheetsFormSyncRespectMetadataProcessor {
  private readonly logger = new Logger(
    GoogleSheetsFormSyncRespectMetadataProcessor.name,
  );

  constructor(
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    private readonly formSyncService: GoogleSheetsFormSyncService,
  ) {}

  @Process()
  async process(job: Job<GoogleSheetsDelayedFormsyncJobData>) {
    this.logger.log('process googleSheets formsync respect metadata', job.data);
    const formsync = await this.formsyncRepository.findOne({
      where: {
        id: job.data.formsyncId,
      },
    });
    await this.formSyncService.runRespectMetadata(formsync);
  }
}
