import { SyncConnectionStatus } from '@lib/core';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateSyncConnectionDto {
  @IsOptional()
  @IsEnum(SyncConnectionStatus)
  status: SyncConnectionStatus;
}
