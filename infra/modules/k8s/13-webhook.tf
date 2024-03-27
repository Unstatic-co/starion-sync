locals {
  webhook_path            = abspath("${path.root}/../apps/webhook")
  webhook_dockerfile_path = abspath("${local.webhook_path}/Dockerfile")
  webhook_files = sort(setunion(
    [
      local.webhook_dockerfile_path
    ],
    [for f in fileset("${local.webhook_path}", "**") : "${local.webhook_path}/${f}"],
  ))
  webhook_hash               = md5(join("_", [for i in local.webhook_files : filemd5(i)]))
  webhook_image_name         = "webhook"
  webhook_image_name_service = "webhook-service"
  webhook_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.webhook_image_name}:${local.webhook_hash}"

  webhook_env = {
    NODE_ENV                = var.environment
    LOG_LEVEL               = var.is_production ? "info" : "debug"
    BROKER_URIS             = var.broker_uris
    DB_TYPE                 = "mongodb"
    DB_URI                  = var.db_uri
    BROKER_TYPE             = "kafka"
    KAFKA_CLIENT_ID         = "webhook"
    KAFKA_CONSUMER_GROUP_ID = "webhook-consumer"
    KAFKA_SSL_ENABLED       = "true"
    KAFKA_SASL_ENABLED      = "true"
    KAFKA_SASL_USERNAME     = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD     = var.kafka_sasl_password
    REDIS_HOST               = var.redis_host
    REDIS_PORT               = var.redis_port
    REDIS_PASSWORD           = var.redis_password
    REDIS_DB = var.redis_db
    REDIS_TLS_ENABLED        = var.redis_tls_enabled
    WEBHOOK_PRIVATE_KEY     = var.webhook_private_key
    TRIGGER_REDEPLOY        = "true"
  }
}

resource "null_resource" "webhook_builder" {
  triggers = {
    hash = local.webhook_hash
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
      DOCKER_FILE_NAME             = local.webhook_dockerfile_path
      DOCKER_IMAGE_NAME            = local.webhook_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

}

resource "kubernetes_deployment" "webhook" {
  depends_on = [
    null_resource.webhook_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.webhook_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.webhook_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_webhook.replicas

    selector {
      match_labels = {
        app = local.webhook_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.webhook_image_name
        }
      }
      spec {
        container {
          name  = local.webhook_image_name
          image = local.webhook_image_url

          dynamic "env" {
            for_each = { for k, v in local.webhook_env : k => v }
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
              cpu    = var.k8s_deployment_webhook.limits.cpu
              memory = var.k8s_deployment_webhook.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_webhook.requests.cpu
              memory = var.k8s_deployment_webhook.requests.memory
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

resource "kubernetes_service" "webhook_service" {
  depends_on = [kubernetes_deployment.webhook, kubernetes_namespace.namespace]
  metadata {
    name      = local.webhook_image_name_service
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.webhook_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.webhook.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}


