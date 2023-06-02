import { ProviderConfig, ProviderType } from '@lib/core';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDataProviderDto {
  @IsNotEmpty()
  type: ProviderType;

  @IsNotEmpty()
  config: ProviderConfig;

  @IsOptional()
  metadata: object;
}
