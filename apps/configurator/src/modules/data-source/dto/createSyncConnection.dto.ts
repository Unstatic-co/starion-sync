import { CreateSyncConnectionDto } from '../../sync-connection/dto/createSyncConnection.dto';
import { OmitType } from '@nestjs/mapped-types';

export class CreateSyncConnectionFromDataSourceDto extends OmitType(
  CreateSyncConnectionDto,
  ['sourceId'] as const,
) {}
