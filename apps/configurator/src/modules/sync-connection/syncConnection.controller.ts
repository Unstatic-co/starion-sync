import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { SyncConnectionService } from './syncConection.service';
import { CreateSyncConnectionDto } from './dto/createSyncConnection.dto';

@Controller('connections')
export class SyncConnectionController {
  constructor(private readonly syncConnectionService: SyncConnectionService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.syncConnectionService.getById(id);
  }

  @Post()
  async create(@Body() dto: CreateSyncConnectionDto) {
    const result = await this.syncConnectionService.create(dto);
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
