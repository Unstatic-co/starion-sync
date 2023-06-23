import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { RepositoryModule } from '@lib/modules';

@Module({
  imports: [RepositoryModule.registerAsync()],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
