output "kafka_username" {
  value = upstash_kafka_credential.kafka_credential.username
}

output "kafka_password" {
  value     = upstash_kafka_credential.kafka_credential.password
  sensitive = true
}

output "kafka_uri" {
  value = upstash_kafka_cluster.kafka_credential.tcp_endpoint
}
