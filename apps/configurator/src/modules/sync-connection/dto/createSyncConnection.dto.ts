import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateSyncConnectionConfigDto {}

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
