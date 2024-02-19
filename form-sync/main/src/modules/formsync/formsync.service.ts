import { Inject, Injectable, Logger } from '@nestjs/common';
import { FormSyncFactory } from './formsync.factory';
import { FormSyncDto } from './dto/formsync.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FormSync } from 'src/entities';
import { Repository } from 'typeorm';
import { ApiError } from 'src/common/exception';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheRegistry } from 'src/common/cache';
import { v4 as uuid } from 'uuid';
import { FormSyncType } from 'src/lib/formsync';

@Injectable()
export class FormSyncService {
  private readonly logger = new Logger(FormSyncService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
    private readonly formSyncFactory: FormSyncFactory,
  ) {}

  async run(data: FormSyncDto) {
    const dataSource = await this.dataSourceRepository.findOne({
      where: {
        id: data.config.dataSourceId,
      },
      select: ['provider'],
    });
    if (!dataSource) {
      throw new ApiError(404, 'data source not found');
    }
    this.logger.log(
      `Running form sync for data source ${data.config.dataSourceId}`,
    );

    const formSync = new FormSync();
    const promises = [];

    if (data.type === FormSyncType.INSERT) {
      Object.assign(data.payload, { recordId: uuid() });
      this.logger.debug(`Generated record id ${data.payload.recordId}`);
      if (data.metadata?.localId) {
        promises.push(
          this.saveLocalIdMapping(data.payload.recordId, data.metadata.localId),
        );
      }
    }

    Object.assign(formSync, {
      dataSourceId: data.config.dataSourceId,
      type: data.type,
      payload: data.payload,
      createdAt: new Date(),
    });

    promises.push(this.formsyncRepository.save(formSync));
    await Promise.all(promises);

    const service = this.formSyncFactory.get(dataSource.provider);
    return service.run(formSync);
  }

  private async saveLocalIdMapping(recordId: string, localId: string) {
    this.logger.debug(`Saving local id mapping for ${recordId}`);
    try {
      await this.cacheManager.set(
        CacheRegistry.RecordLocalIdMapping.Key(recordId),
        localId,
        CacheRegistry.RecordLocalIdMapping.TTL,
      );
    } catch (e) {
      this.logger.error(`Failed to save local id mapping for ${recordId}`);
    }
  }

  async test() {
    this.logger.debug('Test set cache');
    await this.cacheManager.set('test', 'test', 10000);
    this.logger.debug('Set cache success');
  }
}
