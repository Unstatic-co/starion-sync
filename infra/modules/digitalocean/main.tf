locals {
  project_count  = var.is_production ? 1 : 0
  redis_count    = var.is_production ? 1 : 0
  mongodb_count  = var.is_production ? 1 : 0
  postgres_count = var.is_production ? 1 : 0
}
