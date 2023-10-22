output "kafka_username" {
  value = upstash_kafka_credential.starion-sync.username
}

output "kafka_password" {
  value     = upstash_kafka_credential.starion-sync.password
  sensitive = true
}

output "kafka_uri" {
  value = upstash_kafka_cluster.starion-sync.tcp_endpoint
}
