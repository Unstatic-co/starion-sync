import { IDataProviderRepository } from '@lib/modules/repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateDataProviderDto } from './dto/create-provider.dto';
import { InjectTokens } from '@lib/modules';

export abstract class DataProviderService {
  abstract findOne(): Promise<any>;
  abstract create(arg: any): Promise<any>;
}

@Injectable()
export class DefaultDataProviderService implements DataProviderService {
  private readonly logger = new Logger(DefaultDataProviderService.name);

  constructor(
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
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
