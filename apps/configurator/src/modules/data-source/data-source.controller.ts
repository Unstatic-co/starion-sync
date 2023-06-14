import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Query,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { DataSourceService } from './data-source.service';
import { CreateDataSourceDto } from './dto/createDataSource.dto';
import { UpdateDataSourceData } from '@lib/modules';

@Controller('data-source')
export class DataSourceController {
  constructor(private readonly dataSourceService: DataSourceService) {}

  @Get('/test')
  @ApiOperation({ summary: 'get config' })
  test() {
    return this.dataSourceService.test();
  }

  @Get(':dataSourceId')
  get(@Param('dataSourceId') providerId: string) {
    return this.dataSourceService.getById(providerId);
  }

  @Get()
  getHello() {
    return this.dataSourceService.getHello();
  }

  @Post()
  create(@Body() dto: CreateDataSourceDto) {
    return this.dataSourceService.create(dto);
  }

  @Put(':dataSourceId')
  update(
    @Param('dataSourceId') id: string,
    @Body() data: UpdateDataSourceData,
  ) {
    return this.dataSourceService.update(id, data);
  }
}
