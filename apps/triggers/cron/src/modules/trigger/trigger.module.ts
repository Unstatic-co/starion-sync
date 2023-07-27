import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TriggerService } from './trigger.service';
import { RepositoryModule } from '@lib/modules';
import { QUEUES } from '../../common/queues';
import { BrokerModule } from '../broker/broker.module';
import { CronTriggerProcessor } from './trigger.processors';
import { TriggerController } from './trigger.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.CRON_TRIGGER,
    }),
    RepositoryModule.registerAsync(),
    forwardRef(() => BrokerModule),
  ],
  controllers: [TriggerController],
  providers: [TriggerService, CronTriggerProcessor],
  exports: [TriggerService],
})
export class TriggerModule {}
