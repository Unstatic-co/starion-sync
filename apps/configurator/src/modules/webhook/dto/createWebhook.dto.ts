import { WebhookType } from '@lib/core';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
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
}

export class CreateWebhooksDto {
  @IsNotEmpty()
  @Type(() => CreateWebhookDto)
  @ValidateNested({ each: true })
  webhooks: CreateWebhookDto[];
}
