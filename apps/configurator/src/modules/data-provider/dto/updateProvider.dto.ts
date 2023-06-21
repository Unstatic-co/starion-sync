import { Metadata, ProviderType } from '@lib/core';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProviderAuthConfigDto } from './createProvider.dto';

export class UpdateDataProviderDto {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProviderAuthConfigDto)
  auth?: ProviderAuthConfigDto;

  @IsOptional()
  @IsObject()
  metadata?: Metadata;
}
