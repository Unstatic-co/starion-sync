import { Injectable, Logger } from '@nestjs/common';
import { FormSyncFactory } from './formsync.factory';
import { FormSyncDto } from './dto/formsync.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FormSync } from 'src/entities';
import { Repository } from 'typeorm';
import { ApiError } from 'src/common/exception';

@Injectable()
export class FormSyncService {
  private readonly logger = new Logger(FormSyncService.name);

  constructor(
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
    private readonly formSyncFactory: FormSyncFactory,
  ) {}

  async run(data: FormSyncDto) {
    const formSync = new FormSync();
    Object.assign(formSync, {
      dataSourceId: data.config.dataSourceId,
      type: data.type,
      payload: data.payload,
      createdAt: new Date(),
    });
    const [, dataSource] = await Promise.all([
      this.formsyncRepository.save(formSync),
      this.dataSourceRepository.findOne({
        where: {
          id: data.config.dataSourceId,
        },
        select: ['provider'],
      }),
    ]);
    if (!dataSource) {
      throw new ApiError(404, 'data source not found');
    }
    const service = this.formSyncFactory.get(dataSource.provider);
    return service.run(formSync);
  }
}
