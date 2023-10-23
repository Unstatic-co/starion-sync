import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FormSyncType } from 'src/lib/formsync';
import { FieldId, RecordId } from 'src/lib/schema';

export class FormSyncConfigDto {
  @IsNotEmpty()
  @IsString()
  dataSourceId: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  workbookId?: string;

  @IsOptional()
  @IsString()
  worksheetId?: string;

  @IsOptional()
  @IsString()
  spreadsheetId?: string;

  @IsOptional()
  @IsString()
  sheetId?: string;
}

export class FormSyncPayloadDto {
  @IsOptional()
  @IsString()
  recordId?: RecordId;

  @IsOptional()
  @IsObject()
  data?: Record<FieldId, any>;
}

export class FormSyncDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(FormSyncType)
  type: FormSyncType;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FormSyncConfigDto)
  config: FormSyncConfigDto;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => FormSyncPayloadDto)
  payload: FormSyncPayloadDto;
}
