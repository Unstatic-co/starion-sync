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

variable "github_owner" {
  type = string
}
variable "github_repo_name" {
  type = string
}
variable "github_repo_url" {
  type = string
}
variable "github_branch" {
  type = string
}

variable "gcp_project" {
  type    = string
}
variable "gcp_region" {
  type    = string
}
variable "gcp_secret_prefix" {
  type    = string
}
variable "gcp_docker_repository_name" {
  type    = string
}
variable "gcp_deploy_service_account_id" {
  type = string
}

variable "metadata_db_uri" {
  type      = string
  sensitive = true
}

variable "dest_db_uri" { # staging (temporary) & production
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
