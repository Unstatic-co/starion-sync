import {
  EventName,
  EventNames,
  EventPayload,
  SyncConnectionStatus,
  Syncflow,
  SyncflowScheduledPayload,
  Trigger,
  WorkflowStatus,
  WorkflowType,
} from '@lib/core';
import {
  IDataSourceRepository,
  IIdempotencyRepository,
  ISyncConnectionRepository,
  ISyncflowRepository,
  ITransactionManager,
  ITriggerRepository,
  InjectTokens,
  TransactionObject,
} from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSourceService } from '../datasource/datasource.service';
import {
  AcceptableActivityError,
  ActivityError,
  UnacceptableActivityError,
} from '../../common/exception';
import { SyncflowControllerFactory } from '../controller/controller.factory';
import { BrokerService } from '../broker/broker.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(InjectTokens.TRANSACTION_MANAGER)
    private readonly transactionManager: ITransactionManager,
    @Inject(InjectTokens.IDEMPOTENCY_REPOSITORY)
    private readonly idempotencyRepository: IIdempotencyRepository,
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    @Inject(InjectTokens.SYNCFLOW_REPOSITORY)
    private readonly syncflowRepository: ISyncflowRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    @Inject(InjectTokens.SYNC_CONNECTION_REPOSITORY)
    private readonly syncConnectionRepository: ISyncConnectionRepository,
    private readonly dataSourceService: DataSourceService,
    private readonly syncflowControllerFactory: SyncflowControllerFactory,
    private readonly brokerService: BrokerService,
  ) {}

  async checkWorkflowAlreadyScheduled(
    trigger: Trigger,
    transaction?: TransactionObject,
  ) {
    const workflow = await this.syncflowRepository.getById(
      trigger.workflow.id,
      { session: transaction },
    );
    if (!workflow) {
      this.logger.warn(`Workflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableActivityError(
        `Workflow not found: ${trigger.workflow.id}`,
        { shouldWorkflowFail: false },
      );
    }
    if (workflow.state.status !== WorkflowStatus.IDLING) {
      throw new UnacceptableActivityError(
        `Workflow status is already scheduled or running: ${workflow.id}`,
        { shouldWorkflowFail: false },
      );
    }
  }

  async handleWorkflowTriggered(trigger: Trigger) {
    this.logger.debug('handleWorkflowTriggered', trigger);

    const events: {
      name: EventName;
      payload: EventPayload;
    }[] = [];

    await this.transactionManager.runWithTransaction(
      async (transaction: TransactionObject) => {
        try {
          await this.checkWorkflowAlreadyScheduled(trigger, transaction);

          const triggerFromDb = await this.triggerRepository.getById(
            trigger.id,
            { session: transaction },
          );
          if (!triggerFromDb) {
            this.logger.warn(`Trigger not found: ${trigger.id}`);
            throw new UnacceptableActivityError(
              `Trigger not found: ${trigger.id}`,
              {
                shouldWorkflowFail: false,
              },
            );
          }

          switch (trigger.workflow.type) {
            case WorkflowType.SYNCFLOW:
              const syncflow = await this.handleSyncflowTriggered(
                trigger,
                transaction,
              );
              events.push({
                name: EventNames.SYNCFLOW_SCHEDULED,
                payload: {
                  syncflow,
                  version: (syncflow as Syncflow).state.version,
                } as SyncflowScheduledPayload,
              });
              break;
            default:
              throw new UnacceptableActivityError(
                `Unknown workflow type: ${trigger.workflow.type}`,
                {
                  shouldWorkflowFail: true,
                },
              );
          }
        } catch (error) {
          if (error instanceof ActivityError) {
            this.logger.warn(error.message);
          } else {
            throw error;
          }
        }
      },
    );

    await Promise.all(
      events.map(async (event) => {
        await this.brokerService.emitEvent(event.name, {
          payload: event.payload,
        });
      }),
    );
  }

  async handleSyncflowTriggered(
    trigger: Trigger,
    transaction: TransactionObject,
  ) {
    this.logger.debug('handleWorkflowTriggered', trigger);
    const [syncflow, dataSource, syncConnection] = await Promise.all([
      this.syncflowRepository.getById(trigger.workflow.id, {
        session: transaction,
      }),
      this.dataSourceRepository.getById(trigger.sourceId, {
        session: transaction,
      }),
      this.syncConnectionRepository.getByDataSourceId(trigger.sourceId, {
        session: transaction,
      }),
    ]);
    if (!dataSource) {
      this.logger.warn(`DataSource not found: ${syncflow.sourceId}`);
      throw new UnacceptableActivityError(
        `DataSource not found: ${syncflow.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    if (!syncConnection) {
      this.logger.warn(`SyncConnection not found: ${trigger.sourceId}`);
      throw new UnacceptableActivityError(
        `SyncConnection not found: ${trigger.sourceId}`,
        { shouldWorkflowFail: false },
      );
    }
    if (!syncflow) {
      this.logger.warn(`Syncflow not found: ${trigger.workflow.id}`);
      throw new UnacceptableActivityError(
        `Syncflow not found: ${trigger.workflow.id}`,
        { shouldWorkflowFail: false },
      );
    }

    if (syncConnection.state.status !== SyncConnectionStatus.ACTIVE) {
      throw new UnacceptableActivityError(
        `Sync connection is not active: ${syncConnection.id}`,
        { shouldWorkflowFail: false },
      );
    }

    // check status (to avoid idempotency)
    if (syncflow.state.status === WorkflowStatus.SCHEDULED) {
      throw new AcceptableActivityError(
        `Syncflow status is already scheduled: ${syncflow.id}`,
        syncflow,
      );
    }

    const syncflowController = this.syncflowControllerFactory.get(
      dataSource.provider.type,
    );
    await Promise.all([
      // this.dataSourceService.checkLimitation(dataSource),
      syncflowController.run(syncflow, dataSource),
    ]);

    const triggeredSyncflow = await this.syncflowRepository.updateState(
      syncflow.id,
      {
        status: WorkflowStatus.SCHEDULED,
      },
      { new: true, session: transaction },
    );

    return triggeredSyncflow;
  }
}
