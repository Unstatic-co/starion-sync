variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

variable "do_token" {
  type      = string
  sensitive = true
}
