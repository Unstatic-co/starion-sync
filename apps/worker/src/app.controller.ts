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
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('/config')
  @ApiOperation({ summary: 'get config' })
  getConfig() {
    return this.appService.getConfig();
  }

  @Get('/test')
  @ApiOperation({ summary: 'get config' })
  test() {
    return this.appService.test();
  }
}
