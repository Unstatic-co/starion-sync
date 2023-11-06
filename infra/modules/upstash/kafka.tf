resource "upstash_kafka_cluster" "starion-sync" {
  cluster_name = "${var.project}-${var.environment}-kafka"
  region       = var.kafka_region
  multizone    = false
}

resource "upstash_kafka_credential" "starion-sync" {
  cluster_id      = upstash_kafka_cluster.starion-sync.cluster_id
  credential_name = "${var.project}-${var.environment}-kafka-credential"
  topic           = "*"
  permissions     = "ALL"
}

# ***************************** TOPICS *****************************

resource "upstash_kafka_topic" "datasource_error" {
  topic_name       = "dataSource.error"
  partitions       = var.is_production ? 5 : 2
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "datasource_deleted" {
  topic_name       = "dataSource.deleted"
  partitions       = var.is_production ? 5 : 2
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "connection_created" {
  topic_name       = "connection.created"
  partitions       = var.is_production ? 5 : 2
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "connection_deleted" {
  topic_name       = "connection.deleted"
  partitions       = var.is_production ? 5 : 2
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "workflow_triggered" {
  topic_name       = "workflow.triggered"
  partitions       = var.is_production ? 10 : 5
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "syncflow_scheduled" {
  topic_name       = "syncflow.scheduled"
  partitions       = var.is_production ? 10 : 5
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "syncflow_succeed" {
  topic_name       = "syncflow.succeed"
  partitions       = var.is_production ? 10 : 5
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "syncflow_completed" {
  topic_name       = "syncflow.completed"
  partitions       = var.is_production ? 10 : 5
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "syncflow_failed" {
  topic_name       = "syncflow.failed"
  partitions       = var.is_production ? 5 : 2
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}

resource "upstash_kafka_topic" "notify_table" {
  topic_name       = "notifyTable"
  partitions       = var.is_production ? 10 : 5
  retention_time   = 625135
  retention_size   = 725124
  max_message_size = 829213
  cleanup_policy   = "delete"

  cluster_id = upstash_kafka_cluster.starion-sync.cluster_id
}
