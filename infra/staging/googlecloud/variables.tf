variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

variable "github_owner" {
  type = string
}
variable "github_repo_name" {
  type = string
}

variable "github_repo_url" {
  type = string
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

variable "processor_api_keys" {
  type      = list(string)
  sensitive = true
}
