locals {
  test_app_path            = abspath("${path.root}/../apps/test")
  test_app_dockerfile_path = abspath("${local.test_app_path}/Dockerfile")
  test_app_files = sort(setunion(
    [
      local.test_app_dockerfile_path
    ],
    [for f in fileset("${local.test_app_path}", "**") : "${local.test_app_path}/${f}"],
  ))
  test_app_hash       = md5(join("_", [for i in local.test_app_files : filemd5(i)]))
  test_app_image_name = "test-app"
  test_app_image_url  = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.test_app_image_name}:${local.test_app_hash}"

  test_app_env = {
    TRIGGER_REBUILD = "true"
  }
}

resource "null_resource" "test_app_builder" {
  triggers = {
    hash = local.test_app_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      PROJECT_ID                   = var.gcp_project
      ARTIFACT_REGISTRY_LOCATION   = var.gcp_region
      ARTIFACT_REGISTRY_REPOSITORY = var.gcp_docker_repository_name
      DOCKER_FILE_NAME             = local.test_app_dockerfile_path
      DOCKER_IMAGE_NAME            = local.test_app_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

}

resource "kubernetes_deployment" "test_app" {
  depends_on = [
    null_resource.test_app_builder,
    kubernetes_namespace.backend_sync_app,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.test_app_image_name
    namespace = kubernetes_namespace.backend_sync_app.metadata.0.name
    labels = {
      app = local.test_app_image_name
    }
  }
  spec {
    replicas = 1

    selector {
      match_labels = {
        app = local.test_app_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.test_app_image_name
        }
      }
      spec {
        container {
          name  = local.test_app_image_name
          image = local.test_app_image_url

          dynamic "env" {
            for_each = { for k, v in local.test_app_env : k => v }
            content {
              name  = env.key
              value = env.value
            }
          }
          port {
            container_port = 8080
          }

          resources {
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
            requests = {
              cpu    = "1m"
              memory = "10Mi"
            }
          }

        }
        image_pull_secrets {
          name = kubernetes_secret.artifact_registry_secret.metadata.0.name
        }

      }

    }
  }
}
