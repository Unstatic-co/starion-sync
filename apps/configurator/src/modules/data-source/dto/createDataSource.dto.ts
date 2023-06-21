import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProviderConfigDto } from '../../data-provider/dto/createProvider.dto';
import { Metadata, ProviderType } from '@lib/core';

export class DataSourceConfigDto extends ProviderConfigDto {
  @IsOptional()
  @IsString()
  worksheetId?: string;
}

export class CreateDataSourceDto {
  @IsNotEmpty()
  @IsEnum(ProviderType)
  type: ProviderType;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DataSourceConfigDto)
  config: DataSourceConfigDto;

  @IsOptional()
  @IsObject()
  metadata?: Metadata;
}
