import { ProviderType } from '@lib/core';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
class ProviderAuthConfigDto {
  @IsOptional()
  refreshToken: string;
}

class ProviderConfigDto {
  @IsOptional()
  sheetId: string;

  @IsOptional()
  sheetName: string;

  @IsOptional()
  worksheetId: string;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProviderAuthConfigDto)
  auth: ProviderAuthConfigDto;
}

export class CreateDataProviderDto {
  @IsNotEmpty()
  type: ProviderType;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProviderConfigDto)
  config: ProviderConfigDto;

  @IsOptional()
  metadata: object;
}
