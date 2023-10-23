output "redis_host" {
  value = length(digitalocean_database_cluster.redis) > 0 ? digitalocean_database_cluster.redis[0].host : null
}

output "redis_port" {
  value = length(digitalocean_database_cluster.redis) > 0 ? digitalocean_database_cluster.redis[0].port : null
}

output "redis_password" {
  value = length(digitalocean_database_cluster.redis) > 0 ? digitalocean_database_cluster.redis[0].password : null
}
output "redis_uri" {
  value = length(digitalocean_database_cluster.redis) > 0 ? digitalocean_database_cluster.redis[0].uri : null
}

output "mongodb_uri" {
  value = length(digitalocean_database_cluster.mongodb) > 0 ? "${digitalocean_database_cluster.mongodb[0].uri}&tlsInsecure=true" : null
}

output "postgres_uri" {
  value = length(digitalocean_database_cluster.postgres) > 0 ? digitalocean_database_cluster.postgres[0].uri : null
}
