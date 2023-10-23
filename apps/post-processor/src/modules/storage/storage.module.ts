import { Module } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [StorageProvider],
  exports: [StorageProvider],
})
export class StorageModule {}
