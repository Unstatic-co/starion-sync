locals {
  project_count  = var.is_production ? 1 : 1
  redis_count    = var.is_production ? 1 : 1
  mongodb_count  = var.is_production ? 1 : 1
  postgres_count = var.is_production ? 1 : 1
}
