import { ConfigName } from '@lib/core/config';
import { TriggerId, TriggerType } from '@lib/core/entities/trigger';
import { ITriggerRepository, InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiError } from '../../common/exception';
import { ErrorCode } from '../../common/constants';
import { BrokerService } from '../broker/broker.service';
import { EventNames } from '@lib/core';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    private readonly brokerService: BrokerService,
  ) {}

  static createCronExpressionFromFrequency(minutes: number): string {
    const randomSeconds = Math.floor(Math.random() * 60);
    const randomMinutes = Math.floor(Math.random() * minutes);

    return `${randomSeconds} ${randomMinutes}/${minutes} * * * *`;
  }

  async unregisterTrigger(id: TriggerId) {
    this.logger.debug('delete trigger', id);
    const trigger = await this.triggerRepository.getById(id);
    switch (trigger.type) {
      case TriggerType.CRON:
        const cronTriggerUrl = this.configService.get<string>(
          `${ConfigName.SERVICES}.cron.url`,
        );
        await axios.delete(`${cronTriggerUrl}/triggers`, {
          data: {
            cron: trigger.config.cron,
            jobId: trigger.config.jobId,
          },
          validateStatus: (status) => status === 200,
        });
        break;
      default:
        throw new Error('Unsupported trigger type');
    }
    this.logger.debug('deleted trigger', { id });
  }

  async manualTrigger(id: TriggerId) {
    this.logger.debug('manual trigger', id);
    const trigger = await this.triggerRepository.getById(id);
    if (!trigger) {
      throw new ApiError(ErrorCode.NO_DATA_EXISTS, 'Trigger not found');
    }
    switch (trigger.type) {
      case TriggerType.CRON:
      case TriggerType.EVENT_WEBHOOK:
        this.logger.debug(`trigger workflow ${trigger.workflow.id}`);
        await this.brokerService.emitEvent(EventNames.WORKFLOW_TRIGGERED, {
          payload: trigger,
        });
        break;
      default:
        throw new Error('Unsupported trigger type');
    }
    this.logger.debug('manual triggered', { id });
  }
}
