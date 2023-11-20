locals {
  test_app_count        = var.is_production ? 0 : 0
  redis_count           = var.is_production ? 0 : 1 ##
  mongodb_count         = var.is_production ? 0 : 1 ##
  postgres_count        = var.is_production ? 0 : 0
  apps_count            = var.is_production ? 0 : 1 #
  cron_trigger_count    = var.is_production ? 1 : 0
  configurator_count    = var.is_production ? 1 : 0
  controller_count      = var.is_production ? 1 : 0
  worker_count          = var.is_production ? 1 : 0
  post_processor_count  = var.is_production ? 1 : 0
  webhook_count         = var.is_production ? 1 : 0
  webhook_trigger_count = var.is_production ? 1 : 1 ##
  formsync_count        = var.is_production ? 1 : 1 ##
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

  test_app_name = "${var.project}-${var.environment}-test-app"
}
