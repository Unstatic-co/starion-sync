import { Module } from '@nestjs/common';
import { StorageProvider } from './storage.provider';

@Module({
  imports: [],
  controllers: [],
  providers: [StorageProvider],
  exports: [StorageProvider],
})
export class StorageModule {}
