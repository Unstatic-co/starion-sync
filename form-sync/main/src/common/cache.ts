export const DefaultCacheAlias = 'formsync';
export class CacheRegistry {
  static ExcelAccessToken = {
    TTL: 50 * 60 * 1000, // 50 minutes (access token expires in 1 hour so we have max 10 minutes to use it)
    Key: (alias: string) => `excel_access_token:${alias}`,
  };

  static ExcelSessionId = {
    TTL: 4 * 60 * 1000, // 4 minutes (session expires in 5 minutes so we have max 1 minute to use it)
    Key: (workbookId: string, alias: string) =>
      `excel_session_id:${workbookId}:${alias}`,
  };

  static RecordLocalIdMapping = {
    TTL: 10 * 60 * 1000, // 10 minutes
    Key: (recordId: string) =>
      `${DefaultCacheAlias}:record_local_id:${recordId}`,
  };
}
