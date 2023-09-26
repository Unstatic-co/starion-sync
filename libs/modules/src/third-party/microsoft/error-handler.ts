import { AuthError } from '@azure/msal-node';
import { ERROR_CODE, ExternalError } from '@lib/core';
import { GraphError } from '@microsoft/microsoft-graph-client';

export function handleAuthApiError(error: AuthError) {
  switch (error.errorCode) {
    case 'invalid_grant':
      throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
    default:
      throw error;
  }
}

export function handleWorkbookError(error: GraphError) {
  switch (error.statusCode) {
    case 401:
      throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
    case 403:
      throw new ExternalError(
        ERROR_CODE.WORKBOOK_MISSING_PERMISSIONS,
        'Does not have permissions to the workbook',
      );
    case 404:
      throw new ExternalError(
        ERROR_CODE.WORKBOOK_NOT_FOUND,
        'Workbook not found',
      );
    default:
      throw error;
  }
}

export function handleWorksheetError(error: GraphError) {
  switch (error.statusCode) {
    case 401:
      throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
    case 403:
      throw new ExternalError(
        ERROR_CODE.WORKBOOK_MISSING_PERMISSIONS,
        'Does not have permissions to the workbook',
      );
    case 404:
      throw new ExternalError(
        ERROR_CODE.WORKSHEET_NOT_FOUND,
        'Worksheet not found',
      );
    default:
      throw error;
  }
}

export function handleFileError(error: GraphError) {
  switch (error.statusCode) {
    case 401:
      throw new ExternalError(ERROR_CODE.TOKEN_INVALID, 'Token is invalid');
    case 403:
      throw new ExternalError(
        ERROR_CODE.ONE_DRIVE_FILE_MISSING_PERMISSIONS,
        'Does not have permissions to the workbook',
      );
    case 404:
      throw new ExternalError(
        ERROR_CODE.ONE_DRIVE_FILE_NOT_FOUND,
        'File not found',
      );
    default:
      throw error;
  }
}
