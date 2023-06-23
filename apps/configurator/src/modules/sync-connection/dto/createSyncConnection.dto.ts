import {
  SyncConnectionAuthConfig,
  SyncConnectionTriggerConfig,
} from '@lib/core';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProviderAuthConfigDto } from '../../data-provider/dto/createProvider.dto';

export class CreateSyncConnectionAuthConfigDto extends ProviderAuthConfigDto {}

export class CreateSyncConnectionTriggerConfigDto {
  @IsOptional()
  @IsNumber()
  frequency?: number;
}

export class CreateSyncConnectionConfigDto {
  @IsOptional()
  @IsObject()
  @Type(() => CreateSyncConnectionAuthConfigDto)
  @ValidateNested({ each: true })
  auth?: CreateSyncConnectionAuthConfigDto;

  @IsOptional()
  @IsObject()
  @Type(() => CreateSyncConnectionTriggerConfigDto)
  @ValidateNested({ each: true })
  trigger?: CreateSyncConnectionTriggerConfigDto;
}

export class CreateSyncConnectionDto {
  @IsNotEmpty()
  @IsString()
  sourceId: string;

  @IsOptional()
  @IsObject()
  @Type(() => CreateSyncConnectionConfigDto)
  @ValidateNested({ each: true })
  config?: CreateSyncConnectionConfigDto;
}
