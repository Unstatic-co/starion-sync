variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

variable "is_production" {
  type    = bool
  default = false
}

variable "fly_api_token" {
  type      = string
  sensitive = true
}

variable "organization" {
  type    = string
  default = "unstatic"
}

variable "region" {
  type    = string
  default = "nyc1"
}

variable "redis_host" {
  type = string
}
variable "redis_port" {
  type = string
}
variable "redis_password" { # stagging
  type      = string
  sensitive = true
}

variable "mongodb_user" { # stagging
  type      = string
  sensitive = true
}

variable "mongodb_password" { # stagging
  type      = string
  sensitive = true
}

variable "postgres_user" { # stagging
  type      = string
  sensitive = true
}

variable "postgres_password" { # stagging
  type      = string
  sensitive = true
}

variable "db_uri" { # production
  type      = string
  sensitive = true
}

variable "dest_db_uri" { # staging (temporary) & production
  type      = string
  sensitive = true
}

variable "orchestrator_address" {
  type      = string
  sensitive = true
}

variable "orchestrator_namespace" {
  type = string
}

variable "orchestrator_tls_enabled" {
  type = bool
}

variable "orchestrator_client_cert" {
  type      = string
  sensitive = true
}

variable "orchestrator_client_key" {
  type      = string
  sensitive = true
}

variable "broker_uris" {
  type      = string
  sensitive = true
}

variable "kafka_sasl_username" {
  type      = string
  sensitive = true
}

variable "kafka_sasl_password" {
  type      = string
  sensitive = true
}

variable "s3_endpoint" {
  type = string
}

variable "s3_region" {
  type = string
}

variable "s3_bucket" {
  type = string
}

variable "s3_access_key" {
  type      = string
  sensitive = true
}

variable "s3_secret_key" {
  type      = string
  sensitive = true
}

variable "downloader_url" {
  type = string
}
variable "comparer_url" {
  type = string
}
variable "loader_url" {
  type = string
}
variable "metadata_url" {
  type = string
}

variable "api_keys" {
  type      = list(string)
  sensitive = true
}

variable "processor_api_keys" {
  type      = list(string)
  sensitive = true
}

variable "harmonies_api_keys" {
  type      = list(string)
  sensitive = true
}

variable "webhook_public_key" {
  type = string
}

variable "webhook_private_key" {
  type      = string
  sensitive = true
}

variable "microsoft_client_id" {
  type      = string
  sensitive = true
}

variable "microsoft_client_secret" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
