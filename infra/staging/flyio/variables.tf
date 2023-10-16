variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
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

variable "redis_password" {
  type      = string
  sensitive = true
}

variable "mongodb_user" {
  type      = string
  sensitive = true
}

variable "mongodb_password" {
  type      = string
  sensitive = true
}

variable "postgres_user" {
  type      = string
  sensitive = true
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "orchestrator_address" {
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

variable "api_keys" {
  type      = list(string)
  sensitive = true
}

variable "processor_api_keys" {
  type      = list(string)
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

variable "google_secret_id" {
  type      = string
  sensitive = true
}
