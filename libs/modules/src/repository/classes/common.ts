export interface QueryOptions {
  old?: boolean;
  new?: boolean;
  includeDeleted?: boolean;
  select?: string[];
  session?: any;
}
