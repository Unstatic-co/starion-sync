output "redis_uri" {
  value = length(digitalocean_database_cluster.redis) > 0 ? digitalocean_database_cluster.redis[0].uri : null
}

output "mongodb_uri" {
  value = length(digitalocean_database_cluster.mongodb) > 0 ? digitalocean_database_cluster.mongodb[0].uri : null
}

output "postgres_uri" {
  value = length(digitalocean_database_cluster.postgres) > 0 ? digitalocean_database_cluster.postgres[0].uri : null
}
