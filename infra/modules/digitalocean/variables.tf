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


variable "do_token" {
  type      = string
  sensitive = true
}
variable "do_region" {
  type = string
}
