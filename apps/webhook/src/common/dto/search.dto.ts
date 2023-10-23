import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber } from 'class-validator';
import { Utils } from '../utils';

export class SearchDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => Utils.escapeSpecialChars(value))
  keyword = '';

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  page = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  limit = 10;

  @ApiPropertyOptional()
  sort: object;

  @ApiProperty()
  projection: object;
}
