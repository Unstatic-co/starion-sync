variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "fly_api_token" {
  type      = string
  sensitive = true
}

variable "fly_region" {
  type    = string
  default = "lax"
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
