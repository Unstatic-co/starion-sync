import { WebhookType } from '@lib/core';
import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @IsNotEmpty()
  @IsEnum(WebhookType)
  type: WebhookType;

  @IsNotEmpty()
  @IsString()
  @IsUrl()
  url: string;
}
