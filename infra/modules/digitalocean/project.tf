locals {
  project_environment = var.environment == "stagging" ? "staging" : var.environment
}

resource "digitalocean_project" "project" {
  count = local.project_count

  name        = "${var.project}-${var.environment}"
  description = "${var.project} ${var.environment}"
  purpose     = "Web Application"
  environment = local.project_environment
}
