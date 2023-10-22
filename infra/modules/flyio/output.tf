output "redis_uri" {
  value     = length(fly_ip.redis_ip_v4) > 0 ? "redis://default:123456@${fly_ip.redis_ip_v4[0].address}:6379" : null
  sensitive = true
}

output "mongodb_uri" {
  value     = length(fly_ip.mongodb_ip_v4) > 0 ? "mongodb://${var.mongodb_user}:${var.mongodb_password}@${fly_ip.mongodb_ip_v4[0].address}:27017/starion-sync?directConnection=true&authSource=admin" : null
  sensitive = true
}

# output "postgres_uri" {
# value     = "postgres://${var.postgres_user}:${var.postgres_password}@${fly_ip.postgres_ip_v4.address}:5432/starion-sync?sslmode=disable"
# sensitive = true
# }
