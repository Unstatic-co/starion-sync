import { Module } from '@nestjs/common';
import { MicrosoftModule } from '@lib/modules/third-party';
import { RepositoryModule } from '@lib/modules';
import { SyncflowControllerProviders } from './controller.provider';
import { SyncflowControllerFactory } from './controller.factory';

@Module({
  imports: [MicrosoftModule, RepositoryModule.registerAsync()],
  controllers: [],
  providers: [...SyncflowControllerProviders, SyncflowControllerFactory],
  exports: [SyncflowControllerFactory],
})
export class ControllerModule {}
