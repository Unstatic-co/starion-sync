import { ERROR_CODE, ExternalError } from '@lib/core/error';
import { GaxiosError } from './google.type';

export function handleGoogleApiError(error: any) {
  console.log('handleGoogleApiError', JSON.stringify(error));
  const err = error as GaxiosError;
  if (
    err.response.status === 400 &&
    err.response.data.error === 'invalid_grant'
  ) {
    throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
  } else {
    throw error;
  }
}

export function handleSpreadSheetError(error: any) {
  const err = error as GaxiosError;
  const status = err.response.status;
  switch (status) {
    case 400:
      if (err.response.data.error.code === 400) {
        throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
      }
    case 403:
      throw new ExternalError(
        ERROR_CODE.SPREADSHEET_MISSING_PERMISSIONS,
        'Does not have enough permissions to the spreadsheet',
      );
    case 404:
      throw new ExternalError(
        ERROR_CODE.SPREADSHEET_NOT_FOUND,
        'Spreadsheet not found',
      );
    default:
      throw error;
  }
}

export function handleDriveFileError(error: any) {
  const err = error as GaxiosError;
  const status = err.response.status;
  switch (status) {
    case 400:
      if (err.response.data.error.code === 400) {
        throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
      }
    case 403:
      throw new ExternalError(
        ERROR_CODE.GOOGLE_DRIVE_FILE_MISSING_PERMISSIONS,
        'Does not have enough permissions to the google drive file',
      );
    case 404:
      throw new ExternalError(
        ERROR_CODE.GOOGLE_DRIVE_FILE_NOT_FOUND,
        'Drive file not found',
      );
    default:
      throw error;
  }
}
