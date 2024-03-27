locals {
  test_app_count        = var.is_production ? 0 : 0
  redis_count           = var.is_production ? 0 : 1
  mongodb_count         = var.is_production ? 0 : 1
  postgres_count        = var.is_production ? 0 : 0
  apps_count            = var.is_production ? 0 : 1
  cron_trigger_count    = var.is_production ? 1 : 0
  configurator_count    = var.is_production ? 1 : 1
  controller_count      = var.is_production ? 1 : 0
  worker_count          = var.is_production ? 1 : 0
  post_processor_count  = var.is_production ? 1 : 0
  webhook_count         = var.is_production ? 1 : 0
  webhook_trigger_count = var.is_production ? 1 : 1
  formsync_count        = var.is_production ? 1 : 1
  rate_limiter_count    = var.is_production ? 0 : 0
}

locals {
  
  downloader_url    = var.downloader_url
  comparer_url      = var.comparer_url
  loader_url        = var.loader_url
  metadata_url      = var.metadata_url
}

locals {
  redis_app_name    = "${var.project}-${var.environment}-redis"
  mongodb_app_name  = "${var.project}-${var.environment}-mongodb"
  postgres_app_name = "${var.project}-${var.environment}-postgres"
  configurator_app_name    = "${var.project}-${var.environment}-configurator"
  controller_app_name      = "${var.project}-${var.environment}-controller"
  worker_app_name          = "${var.project}-${var.environment}-worker"
  post_processor_app_name  = "${var.project}-${var.environment}-post-processor"
  webhook_app_name         = "${var.project}-${var.environment}-webhook"
  cron_trigger_app_name    = "${var.project}-${var.environment}-cron-trigger"
  webhook_trigger_app_name = "${var.project}-${var.environment}-webhook-trigger"
  formsync_app_name        = "${var.project}-${var.environment}-formsync"
  apps_app_name            = "${var.project}-${var.environment}-apps"
  rate_limiter_app_name = "${var.project}-${var.environment}-rate-limiter"
  test_app_name = "${var.project}-${var.environment}-test-app"
}

resource "random_shuffle" "processor_api_key" {
  input        = var.processor_api_keys
  result_count = 1
}
resource "random_shuffle" "configurator_api_key" {
  input        = var.api_keys
  result_count = 1
}

