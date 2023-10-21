resource "google_artifact_registry_repository" "docker_repository" {
  location      = var.gcp_region
  repository_id = var.gcp_docker_repository_name
  description   = "docker repository for ${var.gcp_project}"
  format        = "DOCKER"

  docker_config {
    immutable_tags = true
  }
}
