locals {
  downloader_path = "${path.root}/../apps/processors/downloader"
  downloader_files = sort(setunion(
    [for f in fileset("${local.downloader_path}", "**") : "${local.downloader_path}/${f}"],
  ))
  downloader_hash = md5(join("", [for i in local.downloader_files : filemd5(i)]))
}

locals {
  downloader_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/downloader:${local.downloader_hash}"
  downloader_image_name         = "downloader"
  downloader_image_name_service = "downloader-service"

  downloader_args_map = {
    PRODUCTION          = "true"
    LOG_LEVEL           = "debug"
    API_KEYS            = join(",", var.processor_api_keys)
    S3_ENDPOINT         = var.s3_endpoint
    S3_REGION           = var.s3_region
    S3_DIFF_DATA_BUCKET = var.s3_bucket
    S3_ACCESS_KEY       = var.s3_access_key
    S3_SECRET_KEY       = var.s3_secret_key
    S3_SSL              = "true"
  }
  DOWNLOADER_ARGS = join(" ", [for k, v in local.downloader_args_map : "--build-arg ${k}=${v}"])
}

resource "null_resource" "downloader_builder" {
  triggers = {
    hash = local.downloader_hash
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
      DOCKER_IMAGE_NAME            = local.downloader_image_name
      DOCKER_IMAGE_DIGEST          = local.downloader_hash
      DOCKER_FILE_NAME             = "Dockerfile"
      WORKDIR                      = abspath(local.downloader_path)
    }
    working_dir = abspath(local.downloader_path)
  }
}

resource "kubernetes_deployment" "downloader" {
  depends_on = [
    null_resource.downloader_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]

  metadata {
    name      = local.downloader_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.downloader_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_downloader.replicas
    selector {
      match_labels = {
        app = local.downloader_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.downloader_image_name
        }
      }
      spec {
        container {
          name  = local.downloader_image_name
          image = local.downloader_image_url

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
            name  = "S3_ENDPOINT"
            value = var.s3_endpoint
          }
          env {
            name  = "S3_REGION"
            value = var.s3_region
          }
          env {
            name  = "S3_DIFF_DATA_BUCKET"
            value = var.s3_bucket
          }
          env {
            name  = "S3_ACCESS_KEY"
            value = var.s3_access_key
          }
          env {
            name  = "S3_SECRET_KEY"
            value = var.s3_secret_key
          }
          env {
            name  = "S3_SSL"
            value = "true"
          }
          port {
            container_port = 8080
          }

          resources {
            limits = {
              cpu    = var.k8s_deployment_downloader.limits.cpu
              memory = var.k8s_deployment_downloader.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_downloader.requests.cpu
              memory = var.k8s_deployment_downloader.requests.memory
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

resource "kubernetes_service" "downloader_service" {
  depends_on = [kubernetes_deployment.downloader]
  metadata {
    name      = local.downloader_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.downloader_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.downloader.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}
