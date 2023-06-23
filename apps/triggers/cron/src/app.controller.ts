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
import { TriggerService } from './modules/trigger/trigger.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly triggerService: TriggerService,
  ) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('/test')
  test() {
    return this.triggerService.testCreateJob();
  }
}
