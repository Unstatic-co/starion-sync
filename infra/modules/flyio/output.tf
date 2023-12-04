output "redis_uri" {
  value     = !var.is_production ? "redis://default:${var.redis_password}@${local.redis_app_name}.fly.dev:6379" : null
  sensitive = true
}

output "mongodb_uri" {
  value     = !var.is_production ? "mongodb://${var.mongodb_user}:${var.mongodb_password}@${local.mongodb_app_name}.fly.dev:27017/starion-sync?directConnection=true&authSource=admin" : null
  sensitive = true
}

output "metadata_db_uri" {
  value     = !var.is_production ? "mongodb://${var.mongodb_user}:${var.mongodb_password}@${local.mongodb_app_name}.fly.dev:27017/starion-form-sync?directConnection=true&authSource=admin" : null
  sensitive = true
}

# output "postgres_uri" {
# value     = "postgres://${var.postgres_user}:${var.postgres_password}@${fly_ip.postgres_ip_v4.address}:5432/starion-sync?sslmode=disable"
# sensitive = true
# }
