export const MIMEType = {
  APPLICATION_JSON: 'application/json',
  IMAGE_PNG: 'image/png',
};

export const ErrorCode = {
  INVALID_DATA: 'E0',
  NO_DATA_EXISTS: 'E1',
  ALREADY_COMPLETED: 'E2',
  HEALTH_CHECK_FAILED: 'E3',
  ALREADY_EXISTS: 'E4',
};

// export const GOOGLE_SHEETS_WEBHOOK_EXPIRATION = 86400; // seconds
export const GOOGLE_SHEETS_WEBHOOK_EXPIRATION = 518400; // seconds (six days)
