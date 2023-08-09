import { WebhookType } from '@lib/core';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateWebhookDto {
  @IsNotEmpty()
  @IsEnum(WebhookType)
  type: WebhookType;

  @IsNotEmpty()
  @IsString()
  url: string;
}
