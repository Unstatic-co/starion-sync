import { ConfigName } from '@lib/core/config';
import { IWebhookRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiError } from '../../common/exception';
import { ErrorCode } from '../../common/constants';
import { BrokerService } from '../broker/broker.service';
import { EventNames } from '@lib/core';
import { CreateWebhookDto } from './dto/createWebhook.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.WEBHOOK_REPOSITORY)
    private readonly webhookRepository: IWebhookRepository,
    private readonly brokerService: BrokerService,
  ) {}

  async create(data: CreateWebhookDto) {
    await this.webhookRepository.create(data);
  }
}
