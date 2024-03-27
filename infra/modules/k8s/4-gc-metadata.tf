locals {
  metadata_path = "${path.root}/../form-sync/module/metadata"
  metadata_files = sort(setunion(
    [for f in fileset("${local.metadata_path}", "**") : "${local.metadata_path}/${f}"],
  ))
  metadata_hash = md5(join("_", [for i in local.metadata_files : filemd5(i)]))
}

locals {
  metadata_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/metadata:${local.metadata_hash}"
  metadata_image_name         = "metadata"
  metadata_image_name_service = "metadata-service"

  metadata_args_map = {
    PRODUCTION = "true"
    LOG_LEVEL  = "debug"
    API_KEYS   = join(",", var.processor_api_keys)
    DB_URI     = var.metadata_db_uri
  }
  METADATA_ARGS = join(" ", [for k, v in local.metadata_args_map : "--build-arg ${k}=${v}"])
}

resource "null_resource" "metadata_builder" {
  triggers = {
    hash = local.metadata_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/usr/bin/env",
      "bash",
    ]
    environment = {
      PROJECT_ID                   = var.gcp_project
      ARTIFACT_REGISTRY_LOCATION   = var.gcp_region
      ARTIFACT_REGISTRY_REPOSITORY = var.gcp_docker_repository_name
      DOCKER_IMAGE_NAME            = local.metadata_image_name
      DOCKER_IMAGE_DIGEST          = local.metadata_hash
      DOCKER_FILE_NAME             = "Dockerfile"
      ARGS                         = local.METADATA_ARGS
      WORKDIR                      = abspath(local.metadata_path)
    }
    working_dir = abspath(local.metadata_path)
  }
}

resource "kubernetes_deployment" "metadata" {
  depends_on = [null_resource.metadata_builder, kubernetes_namespace.namespace, kubernetes_secret.artifact_registry_secret]
  metadata {
    name      = local.metadata_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.metadata_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_metadata.replicas

    selector {
      match_labels = {
        app = local.metadata_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.metadata_image_name
        }
      }
      spec {
        container {
          name  = local.metadata_image_name
          image = local.metadata_image_url

          env {
            name  = "PRODUCTION"
            value = "true"
          }
          env {
            name  = "LOG_LEVEL"
            value = "debug"
          }
          env {
            name  = "API_KEYS"
            value = join(",", var.processor_api_keys)
          }
          env {
            name  = "DB_URI"
            value = var.metadata_db_uri
          }
          port {
            container_port = 8080
          }

          resources {
            limits = {
              cpu    = var.k8s_deployment_metadata.limits.cpu
              memory = var.k8s_deployment_metadata.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_metadata.requests.cpu
              memory = var.k8s_deployment_metadata.requests.memory
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

resource "kubernetes_service" "metadata_service" {
  depends_on = [kubernetes_deployment.metadata, kubernetes_namespace.namespace]
  metadata {
    name      = local.metadata_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.metadata_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.metadata.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}
