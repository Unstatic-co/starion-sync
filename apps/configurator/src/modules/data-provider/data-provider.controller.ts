import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateDataProviderDto } from './dto/createProvider.dto';
import { DataProviderService } from './data-provider.service';
import { DataDiscovererService } from '../discoverer/discoverer.service';
import { UpdateDataProviderDto } from './dto/updateProvider.dto';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';

@Controller('dataproviders')
export class DataProviderController {
  constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly dataDiscovererService: DataDiscovererService,
  ) {}

  @Get(':providerId/discover')
  discover(@Param('providerId') providerId: string) {
    return this.dataDiscovererService.discover(providerId);
  }

  @Get(':provider_id')
  get(@Param('provider_id') providerId: string) {
    return this.dataDiscovererService.getById(providerId);
  }

  @Post()
  async create(@Body() createDataProviderDto: CreateDataProviderDto) {
    const result = await this.dataProviderService.create(createDataProviderDto);
    if (result.isAlreadyCreated) {
      throw new ApiError(ErrorCode.ALREADY_EXISTS, 'Provider already exists', {
        providerId: result.data.id,
      });
    }
    return result.data;
  }

  @Put(':provider_id')
  update(
    @Param('provider_id') providerId: string,
    @Body() updateDataProviderDto: UpdateDataProviderDto,
  ) {
    return this.dataProviderService.update(providerId, updateDataProviderDto);
  }
}
