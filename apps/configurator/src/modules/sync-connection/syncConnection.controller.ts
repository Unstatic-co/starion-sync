import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { SyncConnectionService } from './syncConection.service';
import { CreateSyncConnectionDto } from './dto/createSyncConnection.dto';
import { WorkflowService } from '../workflow/workflow.service';
import { createSyncConnectionWf } from '../../workflows';

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
    const result = await this.workflowService.executeWorkflow(
      createSyncConnectionWf,
      {
        workflowId: `${data.sourceId}`,
        args: [data],
        workflowExecutionTimeout: 5000,
      },
    );
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
}
