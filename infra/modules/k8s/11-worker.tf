locals {
  worker_path            = abspath("${path.root}/../apps/worker")
  worker_dockerfile_path = abspath("${local.worker_path}/Dockerfile")
  worker_files = sort(setunion(
    [
      local.worker_dockerfile_path
    ],
    [for f in fileset("${local.worker_path}", "**") : "${local.worker_path}/${f}"],
  ))
  worker_hash               = md5(join("_", [for i in local.worker_files : filemd5(i)]))
  worker_image_name         = "worker"
  worker_image_name_service = "worker-service"
  worker_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.worker_image_name}:${local.worker_hash}"

  worker_env = {
    NODE_ENV                       = var.environment
    LOG_LEVEL                      = var.is_production ? "info" : "debug"
    BROKER_URIS                    = var.broker_uris
    DB_TYPE                        = "mongodb"
    DB_URI                         = var.db_uri
    BROKER_TYPE                    = "kafka"
    KAFKA_CLIENT_ID                = "worker"
    KAFKA_CONSUMER_GROUP_ID        = "worker-consumer"
    KAFKA_SSL_ENABLED              = "true"
    KAFKA_SASL_ENABLED             = "true"
    KAFKA_SASL_USERNAME            = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD            = var.kafka_sasl_password
    ORCHESTRATOR_ADDRESS           = var.orchestrator_address
    ORCHESTRATOR_NAMESPACE         = var.orchestrator_namespace
    ORCHESTRATOR_WORKER_TASKQUEUE  = "worker"
    ORCHESTRATOR_DEFAULT_TASKQUEUE = "worker"
    ORCHESTRATOR_TLS_ENABLED       = var.orchestrator_tls_enabled
    ORCHESTRATOR_CLIENT_CERT       = var.orchestrator_client_cert
    ORCHESTRATOR_CLIENT_KEY        = var.orchestrator_client_key
    DOWNLOADER_URL                 = var.downloader_url
    COMPARER_URL                   = var.comparer_url
    LOADER_URL                     = var.loader_url
    PROCESSOR_API_KEY              = random_shuffle.processor_api_key.result[0]
    MICROSOFT_CLIENT_ID            = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET        = var.microsoft_client_secret
    GOOGLE_CLIENT_ID               = var.google_client_id
    GOOGLE_CLIENT_SECRET           = var.google_client_secret
    TRIGGER_REDEPLOY               = "true"
  }
}

resource "null_resource" "worker_builder" {
  triggers = {
    hash = local.worker_hash
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
      DOCKER_FILE_NAME             = local.worker_dockerfile_path
      DOCKER_IMAGE_NAME            = local.worker_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

}

resource "kubernetes_deployment" "worker" {
  depends_on = [
    null_resource.worker_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.worker_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.worker_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_worker.replicas

    selector {
      match_labels = {
        app = local.worker_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.worker_image_name
        }
      }
      spec {
        container {
          name  = local.worker_image_name
          image = local.worker_image_url

          dynamic "env" {
            for_each = { for k, v in local.worker_env : k => v }
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
              cpu    = var.k8s_deployment_worker.limits.cpu
              memory = var.k8s_deployment_worker.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_worker.requests.cpu
              memory = var.k8s_deployment_worker.requests.memory
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

resource "kubernetes_service" "worker_service" {
  depends_on = [kubernetes_deployment.worker, kubernetes_namespace.namespace]
  metadata {
    name      = local.worker_image_name_service
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.worker_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.worker.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}
