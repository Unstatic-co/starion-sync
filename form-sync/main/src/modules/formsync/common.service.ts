import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FormSync } from 'src/entities';
import { Repository } from 'typeorm';

@Injectable()
export class FormSyncCommonService {
  private readonly logger = new Logger(FormSyncCommonService.name);

  constructor(
    @InjectRepository(FormSync)
    private formsyncRepository: Repository<FormSync>,
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
  ) {}

  async getDataSourceSchema(dataSourceId: string) {
    const dataSource = await this.dataSourceRepository.findOne({
      where: {
        id: dataSourceId,
      },
      select: ['schema'],
    });
    return dataSource?.schema;
  }
}
