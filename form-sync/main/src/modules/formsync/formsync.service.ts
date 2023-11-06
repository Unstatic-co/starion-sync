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

    const formSync = new FormSync();
    const promises = [];

    if (data.type === FormSyncType.INSERT) {
      Object.assign(data.payload, { recordId: uuid() });
      if (data.metadata?.localId) {
        promises.push(
          this.cacheManager.set(
            CacheRegistry.RecordLocalIdMapping.Key(data.payload.recordId),
            data.metadata.localId,
            CacheRegistry.RecordLocalIdMapping.TTL,
          ),
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
}
