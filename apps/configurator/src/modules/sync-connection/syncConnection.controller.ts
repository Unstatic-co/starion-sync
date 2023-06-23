import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { SyncConnectionService } from './syncConection.service';
import { CreateSyncConnectionDto } from './dto/createSyncConnection.dto';
import { WorkflowService } from '../workflow/workflow.service';
import {
  createSyncConnectionWf,
  deleteSyncConnectionWf,
} from '../../workflows';
import { DeleteResult } from '../../common/type/deleteResult';
import { SyncConnection } from '@lib/core';
import { CreationResult } from '../../common/type';

@Controller('connections')
export class SyncConnectionController {
  constructor(
    private readonly syncConnectionService: SyncConnectionService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.syncConnectionService.getById(id);
  }

  @Post()
  async create(@Body() data: CreateSyncConnectionDto) {
    const result = (await this.workflowService.executeWorkflow(
      createSyncConnectionWf,
      {
        workflowId: `${data.sourceId}`,
        args: [data],
        workflowExecutionTimeout: 5000,
      },
    )) as CreationResult<SyncConnection>;
    if (result.isAlreadyCreated) {
      throw new ApiError(
        ErrorCode.ALREADY_EXISTS,
        'Sync connection for data source already exists',
        {
          syncConnectionId: result.data.id,
        },
      );
    }
    return result.data;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = (await this.workflowService.executeWorkflow(
      deleteSyncConnectionWf,
      {
        workflowId: `${id}`,
        args: [id],
        workflowExecutionTimeout: 10000,
      },
    )) as DeleteResult<SyncConnection>;
    if (result.isAlreadyDeleted) {
      throw new ApiError(
        ErrorCode.ALREADY_EXISTS,
        'Sync connection is already deleted',
      );
    }
    return result.data;
  }
}
