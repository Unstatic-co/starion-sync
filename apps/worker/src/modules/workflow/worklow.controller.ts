import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';

@Controller('/workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('/test')
  test() {
    return this.workflowService.executeWorkflow('connection.created', {
      taskQueue: 'default',
      workflowId: 'id-1',
    });
  }
}
