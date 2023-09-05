import { WebhookType } from '@lib/core';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
} from 'class-validator';

export class CreateWebhookDto {
  @IsNotEmpty()
  @IsEnum(WebhookType)
  type: WebhookType;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsBoolean()
  assure?: boolean;

  @IsOptional()
  @IsString()
  dataSourceId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateWebhooksDto {
  @IsNotEmpty()
  @Type(() => CreateWebhookDto)
  @ValidateNested({ each: true })
  webhooks: CreateWebhookDto[];
}
