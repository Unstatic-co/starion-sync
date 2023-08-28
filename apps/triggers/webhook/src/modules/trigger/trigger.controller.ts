import {
  Body,
  Controller,
  Delete,
  Headers,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { DeleteTriggerDto } from './dto/deleteTrigger.dto';
import { Response } from 'express';

@Controller('triggers')
export class TriggerController {
  private readonly logger = new Logger(TriggerController.name);

  constructor(private readonly triggerService: TriggerService) {}

  @Post('/google-sheets/:triggerId')
  async triggerWebhookGoogleSheets(
    @Param('triggerId') triggerId: string,
    @Headers('x-goog-channel-id') webhookId: string,
    @Headers('x-goog-resource-state') state: string,
    @Headers('x-goog-changed') changed: string,
    @Res() res: Response,
  ) {
    this.logger.debug(
      `trigger webhook google sheets, triggerId = ${triggerId}, webhookId = ${webhookId}, state = ${state}, changed = ${changed}`,
    );

    if (state != 'update' || !changed.includes('content')) {
      res.status(204);
      return;
    }
    const trigger = await this.triggerService.getByWebhookId(webhookId);
    if (!trigger) {
      res.status(204);
      return;
    }
    return this.triggerService.handleReceivedWebhook(triggerId);
  }

  @Delete()
  async deleteTrigger(@Body() data: DeleteTriggerDto) {
    return this.triggerService.deleteTrigger(data);
  }
}
