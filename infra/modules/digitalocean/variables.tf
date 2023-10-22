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


variable "do_token" {
  type      = string
  sensitive = true
}
variable "do_region" {
  type = string
}
