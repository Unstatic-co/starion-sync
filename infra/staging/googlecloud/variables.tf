variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

variable "gcp_project" {
  type    = string
  default = "starion-stagging"
}

variable "gcp_region" {
  type    = string
  default = "us-central1"
}

variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "postgres_uri" {
  type      = string
  sensitive = true
}

variable "processor_api_keys" {
  type      = string
  sensitive = true
}
