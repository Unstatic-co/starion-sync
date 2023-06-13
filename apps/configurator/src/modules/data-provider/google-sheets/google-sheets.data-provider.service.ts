import { IDataProviderRepository } from '@lib/modules/repository';
import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { CreateDataProviderDto } from '../dto/create-provider.dto';
import { DataProviderService } from '../data-provider.service';
import { REQUEST } from '@nestjs/core';
import { InjectTokens } from '@lib/modules';

@Injectable()
export class GoogleSheetsDataProviderService implements DataProviderService {
  private readonly logger = new Logger(GoogleSheetsDataProviderService.name);

  constructor(
    @Inject(REQUEST) private readonly request: any,
    @Inject(InjectTokens.DATA_PROVIDER_REPOSITORY)
    private readonly dataProviderRepository: IDataProviderRepository,
  ) {}

  public async findOne() {
    this.logger.log('google sheets findOne');
    return await this.dataProviderRepository.getById('1');
  }

  public async create(dto: CreateDataProviderDto) {
    const { type, config, metadata } = dto;
    this.logger.log('request', this.request);
    this.logger.log('google sheets create');
    return {} as any;
  }
}
