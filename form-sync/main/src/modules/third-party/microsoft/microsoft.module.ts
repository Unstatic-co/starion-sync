import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MicrosoftGraphService, MicrosoftService } from './microsoft.service';
import { MicrosoftAuthClientProvider } from './microsoft.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MicrosoftAuthClientProvider,
    MicrosoftService,
    MicrosoftGraphService,
  ],
  exports: [
    MicrosoftAuthClientProvider,
    MicrosoftService,
    MicrosoftGraphService,
  ],
})
export class MicrosoftModule {}
