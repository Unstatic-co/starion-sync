export interface TriggerConfig {
  // schedule?: string;
  // interval?: number;
  // topic?: string;
  [key: string]: any;
}

export interface CronTriggerConfig extends TriggerConfig {
  cron: string;
  jobId: string;
  frequency: number; // minutes
}
