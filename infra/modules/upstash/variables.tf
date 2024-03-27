variable "project" {
  type    = string
}

variable "environment" {
  type    = string
}

variable "is_production" {
  type    = bool
  default = false
}

variable "upstash_api_key" {
  type      = string
  sensitive = true
}

variable "upstash_email" {
  type = string
}

variable "kafka_region" {
  type = string
}
