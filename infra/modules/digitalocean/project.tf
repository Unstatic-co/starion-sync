resource "digitalocean_project" "starion_sync" {
  count = var.is_production ? 1 : 0

  name        = "${var.project}-${var.environment}"
  description = "${var.project} ${var.environment}"
  purpose     = "Web Application"
  environment = var.environment
}
