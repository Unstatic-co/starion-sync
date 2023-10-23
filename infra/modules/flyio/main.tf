locals {
  redis_count          = var.is_production ? 0 : 1
  mongodb_count        = var.is_production ? 0 : 1
  postgres_count       = var.is_production ? 0 : 0
  apps_count           = var.is_production ? 0 : 1
  cron_trigger_count   = var.is_production ? 1 : 0
  configurator_count   = var.is_production ? 1 : 0
  controller_count     = var.is_production ? 1 : 0
  worker_count         = var.is_production ? 1 : 0
  post_processor_count = var.is_production ? 1 : 0
  webhook_count        = var.is_production ? 1 : 0
}
