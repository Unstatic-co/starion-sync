import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { DataSourceService } from './data-source.service';

@Controller('data-source')
export class DataSourceController {
  constructor(private readonly dataSourceService: DataSourceService) {}

  @Get()
  getHello() {
    return this.dataSourceService.getHello();
  }

  @Get('/test')
  @ApiOperation({ summary: 'get config' })
  test() {
    return this.dataSourceService.test();
  }
}
