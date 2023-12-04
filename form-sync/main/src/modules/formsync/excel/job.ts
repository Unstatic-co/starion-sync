import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { ExcelFormSyncService } from '.';
import { InjectRepository } from '@nestjs/typeorm';
import { DelayedFormSync, FormSync } from 'src/entities';
import { Repository } from 'typeorm';
import { EXCEL_JOB_QUEUES } from 'src/common/inject-tokens';

export type ExcelUpdateMetadataJobData = {
  dataSourceId: string;
};
export type ExcelDelayedFormsyncJobData = {
  formsyncId: string;
};

export const EXCEL_UPDATE_METADATA_FREQUENCY = 4; // minutes

@Processor(EXCEL_JOB_QUEUES.UPDATE_METADATA)
@Injectable()
export class ExcelUpdateMetadataProcessor {
  private readonly logger = new Logger(ExcelUpdateMetadataProcessor.name);

  constructor(
    @InjectQueue(EXCEL_JOB_QUEUES.FORM_SYNC_RESPECT_METADATA)
    private readonly excelDelayedFormsyncQueue: Queue,
    @InjectRepository(DelayedFormSync)
    private delayedFormsyncRepository: Repository<DelayedFormSync>,
    private readonly formSyncService: ExcelFormSyncService,
  ) {}

  @Process()
  async process(job: Job<ExcelUpdateMetadataJobData>) {
    this.logger.log('process excel update metadata', job.data);

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
          await this.excelDelayedFormsyncQueue.add(
            {
              formsyncId: delayedFormsync.formsync.id,
            } as ExcelDelayedFormsyncJobData,
            {
              jobId: delayedFormsync.formsync.id,
              removeOnComplete: true,
              removeOnFail: true,
            },
          );
        }),
      );
    } catch (error) {
      this.logger.warn(`error processing excel update metadata`, error);
      throw error;
    }
  }
}

@Processor(EXCEL_JOB_QUEUES.FORM_SYNC_RESPECT_METADATA)
@Injectable()
export class ExcelFormSyncRespectMetadataProcessor {
  private readonly logger = new Logger(
    ExcelFormSyncRespectMetadataProcessor.name,
  );

  constructor(
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    private readonly formSyncService: ExcelFormSyncService,
  ) {}

  @Process()
  async process(job: Job<ExcelDelayedFormsyncJobData>) {
    this.logger.log('process excel formsync respect metadata', job.data);
    const formsync = await this.formsyncRepository.findOne({
      where: {
        id: job.data.formsyncId,
      },
    });
    await this.formSyncService.runRespectMetadata(formsync);
  }
}
