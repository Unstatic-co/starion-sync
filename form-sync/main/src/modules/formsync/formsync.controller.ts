import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FormSyncService } from './formsync.service';
import { FormSyncDto } from './dto/formsync.dto';
import { ApiKeyGuard } from 'src/common/guard/apiKey.guard';

@Controller('formsync')
@UseGuards(ApiKeyGuard)
export class FormSyncController {
  constructor(private readonly formSyncService: FormSyncService) {}

  @Post('test')
  test() {
    return this.formSyncService.test();
  }

  @Post()
  run(@Body() data: FormSyncDto) {
    return this.formSyncService.run(data);
  }
}
