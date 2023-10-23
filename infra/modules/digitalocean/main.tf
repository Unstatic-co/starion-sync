locals {
  redis_count    = var.is_production ? 1 : 1
  mongodb_count  = var.is_production ? 1 : 1
  postgres_count = var.is_production ? 1 : 1
}
