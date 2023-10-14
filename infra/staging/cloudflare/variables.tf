variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

# variable "cf_api_token" {
# type = string
# }

variable "cf_zone_id" {
  type = string
}

variable "cf_account_id" {
  type = string
}
