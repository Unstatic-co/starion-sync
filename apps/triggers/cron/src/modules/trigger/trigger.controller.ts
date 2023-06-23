import { Body, Controller, Delete } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { DeleteTriggerDto } from './dto/deleteTrigger.dto';

@Controller('triggers')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Delete()
  async deleteTrigger(@Body() data: DeleteTriggerDto) {
    return this.triggerService.deleteTrigger(data);
  }
}
