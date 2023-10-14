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

variable "fly_region" {
  type    = string
  default = "lax"
}

variable "gcp_project" {
  type    = string
  default = "starion-stagging"
}

variable "gcp_region" {
  type    = string
  default = "us-central1"
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

variable "api_keys" {
  type      = string
  sensitive = true
  default   = "api-key"
}

variable "processor_api_keys" {
  type      = string
  sensitive = true
  default   = "api-key"
}

variable "microsoft_client_id" {
  type      = string
  sensitive = true
}

variable "microsoft_secret_id" {
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

# variable "db_uri" {
# type      = string
# sensitive = true
# }

# variable "dest_db_uri" {
# type      = string
# sensitive = true
# }

# variable "broker_uris" {
# type      = string
# sensitive = true
# }

# variable "orchestrator_address" {
# type      = string
# sensitive = true
# }
