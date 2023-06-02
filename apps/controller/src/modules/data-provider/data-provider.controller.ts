import { Body, Controller, Get, Post } from '@nestjs/common';
import { DataProviderService } from './data-provider.service';
import { CreateDataProviderDto } from './dto/create-provider.dto';

@Controller('data-provider')
export class DataProviderController {
  constructor(private readonly dataProviderService: DataProviderService) {}

  @Get()
  get() {}

  @Post()
  create(@Body() createDataProviderDto: CreateDataProviderDto) {
    return this.dataProviderService.create(createDataProviderDto);
  }
}
