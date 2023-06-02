import {
  DATA_PROVIDER_REPOSITORY,
  IDataProviderRepository,
} from '@lib/modules/repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateDataProviderDto } from './dto/create-provider.dto';

@Injectable()
export class DataProviderService {
  private readonly logger = new Logger(DataProviderService.name);

  constructor(
    @Inject(DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
  ) {}

  public async findOne() {
    this.logger.log('findOne');
    return await this.dataProviderRepository.getById('1');
  }

  public async create(dto: CreateDataProviderDto) {
    const { type, config, metadata } = dto;
    this.logger.log('create');
    return await this.dataProviderRepository.create({
      type,
      config,
      metadata,
    });
  }
}
