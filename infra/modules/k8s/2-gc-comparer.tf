locals {
  comparer_path = "${path.root}/../apps/processors/comparer"
  comparer_files = sort(setunion(
    [for f in fileset("${local.comparer_path}", "**") : "${local.comparer_path}/${f}"],
  ))
  comparer_hash = md5(join("", [for i in local.comparer_files : filemd5(i)]))
}

locals {
  comparer_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/comparer:${local.comparer_hash}"
  comparer_image_name         = "comparer"
  comparer_image_name_service = "comparer-service"
  comparer_args_map = {
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
  COMPARER_ARGS = join(" ", [for k, v in local.comparer_args_map : "--build-arg ${k}=${v}"])
}

resource "null_resource" "comparer_builder" {
  triggers = {
    hash = local.comparer_hash
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
      DOCKER_IMAGE_NAME            = local.comparer_image_name
      DOCKER_IMAGE_DIGEST          = local.comparer_hash
      DOCKER_FILE_NAME             = "Dockerfile"
      WORKDIR                      = abspath(local.comparer_path)
    }
    working_dir = abspath(local.comparer_path)
  }
}

resource "kubernetes_deployment" "comparer" {
  depends_on = [
    null_resource.comparer_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.comparer_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.comparer_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_comparer.replicas

    selector {
      match_labels = {
        app = local.comparer_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.comparer_image_name
        }
      }
      spec {
        container {
          name  = local.comparer_image_name
          image = local.comparer_image_url

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
              cpu    = var.k8s_deployment_comparer.limits.cpu
              memory = var.k8s_deployment_comparer.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_comparer.requests.cpu
              memory = var.k8s_deployment_comparer.requests.memory
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

resource "kubernetes_service" "comparer_service" {
  depends_on = [kubernetes_deployment.comparer]
  metadata {
    name      = local.comparer_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.comparer_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.comparer.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}
