locals {
  cron_trigger_path            = abspath("${path.root}/../apps/triggers/cron")
  cron_trigger_dockerfile_path = abspath("${local.cron_trigger_path}/Dockerfile")
  cron_trigger_files = sort(setunion(
    [
      local.cron_trigger_dockerfile_path
    ],
    [for f in fileset("${local.cron_trigger_path}", "**") : "${local.cron_trigger_path}/${f}"],
  ))
  cron_trigger_hash       = md5(join("_", [for i in local.cron_trigger_files : filemd5(i)]))
  cron_trigger_image_name = "crontrigger"
  cron_trigger_image_url  = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.cron_trigger_image_name}:${local.cron_trigger_hash}"
  cron_trigger_env = {
    NODE_ENV                = var.environment
    LOG_LEVEL               = var.is_production ? "debug" : "debug"
    DB_TYPE                 = "mongodb"
    DB_URI                  = var.db_uri
    BROKER_TYPE             = "kafka"
    BROKER_URIS             = var.broker_uris
    KAFKA_CLIENT_ID         = "cron-trigger"
    KAFKA_CONSUMER_GROUP_ID = "cron-trigger-consumer"
    KAFKA_SSL_ENABLED       = "true"
    KAFKA_SASL_ENABLED      = "true"
    KAFKA_SASL_USERNAME     = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD     = var.kafka_sasl_password
    REDIS_HOST               = var.redis_host
    REDIS_PORT               = var.redis_port
    REDIS_PASSWORD           = var.redis_password
    REDIS_DB = var.redis_db
    REDIS_TLS_ENABLED        = var.redis_tls_enabled
    TRIGGER_REBUILD         = "true"
  }
}


resource "null_resource" "cron_trigger_builder" {
  triggers = {
    hash = local.cron_trigger_hash
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
      DOCKER_FILE_NAME             = local.cron_trigger_dockerfile_path
      DOCKER_IMAGE_NAME            = local.cron_trigger_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }
}


resource "kubernetes_deployment" "cron_trigger" {
  depends_on = [
    null_resource.cron_trigger_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.cron_trigger_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.cron_trigger_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_cron_trigger.replicas

    selector {
      match_labels = {
        app = local.cron_trigger_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.cron_trigger_image_name
        }
      }
      spec {
        container {
          name  = local.cron_trigger_image_name
          image = local.cron_trigger_image_url

          dynamic "env" {
            for_each = { for k, v in local.cron_trigger_env : k => v }
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
              cpu    = var.k8s_deployment_cron_trigger.limits.cpu
              memory = var.k8s_deployment_cron_trigger.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_cron_trigger.requests.cpu
              memory = var.k8s_deployment_cron_trigger.requests.memory
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
