import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateDataProviderDto } from './dto/create-provider.dto';
import { DataProviderService } from './data-provider.service';
import { DataDiscovererService } from '../discoverer/discoverer.service';

@Controller('data-provider')
export class DataProviderController {
  constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly dataDiscovererService: DataDiscovererService,
  ) {}

  @Get(':providerId/discover')
  discover(@Param('providerId') providerId: string) {
    return this.dataDiscovererService.discover(providerId);
  }

  @Get()
  get() {}

  @Post()
  create(@Body() createDataProviderDto: CreateDataProviderDto) {
    return this.dataProviderService.create(createDataProviderDto);
  }
}
