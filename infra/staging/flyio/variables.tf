variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

variable "api_token" {
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
