import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { RepositoryModule } from '@lib/modules';
import { BrokerModule } from '../broker/broker.module';
import { TriggerController } from './trigger.controller';

@Module({
  imports: [RepositoryModule.registerAsync(), BrokerModule],
  controllers: [TriggerController],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
