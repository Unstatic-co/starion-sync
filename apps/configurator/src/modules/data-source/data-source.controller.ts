import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  DataSourceService,
  DeleteDataSourceResult,
} from './data-source.service';
import { CreateDataSourceDto } from './dto/createDataSource.dto';
import { OrchestratorService, UpdateDataSourceData } from '@lib/modules';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { CreateSyncConnectionFromDataSourceDto } from './dto/createSyncConnection.dto';
import { SyncConnectionService } from '../sync-connection/syncConection.service';
import { WorkflowService } from '../workflow/workflow.service';
import { createSyncConnectionWf } from '../../workflows';
import { deleteDataSourceWf } from '../../workflows/dataSource.workflows';
import { DeleteResult } from '../../common/type/deleteResult';
import { DataSource } from '@lib/core';

@Controller('datasources')
export class DataSourceController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly dataSourceService: DataSourceService,
    private readonly syncConnectionService: SyncConnectionService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  @Get('/test')
  @ApiOperation({ summary: 'get config' })
  test() {
    return this.dataSourceService.test();
  }

  @Get(':dataSourceId')
  get(@Param('dataSourceId') id: string) {
    return this.dataSourceService.getById(id);
  }

  @Get(':dataSourceId/schema')
  getSchema(@Param('dataSourceId') id: string) {
    return this.dataSourceService.getSchema(id);
  }

  @Get(':dataSourceId/data')
  getData(@Param('dataSourceId') id: string) {
    return this.dataSourceService.getData(id);
  }

  @Get()
  getHello() {
    return this.dataSourceService.getHello();
  }

  @Post(':id/connections')
  async createConnection(
    @Param('id') id: string,
    data: CreateSyncConnectionFromDataSourceDto,
  ) {
    const result = await this.workflowService.executeWorkflow(
      createSyncConnectionWf,
      {
        workflowId: `${id}`,
        args: [{ ...data, sourceId: id }],
        // workflowExecutionTimeout: 5000,
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

  @Post()
  async create(@Body() dto: CreateDataSourceDto) {
    const result = await this.dataSourceService.create(dto);
    if (result.isAlreadyCreated) {
      throw new ApiError(
        ErrorCode.ALREADY_EXISTS,
        'Data source already exists',
        {
          dataSourceId: result.data.id,
        },
      );
    }
    return result.data;
  }

  @Put(':dataSourceId')
  update(
    @Param('dataSourceId') id: string,
    @Body() data: UpdateDataSourceData,
  ) {
    return this.dataSourceService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = (await this.orchestratorService.executeWorkflow(
      deleteDataSourceWf,
      {
        workflowId: `${id}`,
        args: [id],
        waitResult: true,
      },
    )) as DeleteResult<DeleteDataSourceResult>;
    if (result.isAlreadyDeleted) {
      throw new ApiError(
        ErrorCode.ALREADY_EXISTS,
        'Data source is already deleted',
      );
    }
    return result.data;
  }
}
