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
export class ProviderAuthConfigDto {
  @IsOptional()
  @IsString()
  refreshToken: string;
}

export class ProviderConfigDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsString()
  workbookId?: string;

  @IsOptional()
  @IsString()
  driveId?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProviderAuthConfigDto)
  auth: ProviderAuthConfigDto;
}

export class CreateDataProviderDto {
  @IsNotEmpty()
  @IsEnum(ProviderType)
  type: ProviderType;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProviderConfigDto)
  config: ProviderConfigDto;

  @IsOptional()
  @IsObject()
  metadata?: Metadata;
}
