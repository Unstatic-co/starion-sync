locals {
  webhook_trigger_path            = abspath("${path.root}/../apps/triggers/webhook")
  webhook_trigger_dockerfile_path = abspath("${local.webhook_trigger_path}/Dockerfile")
  webhook_trigger_files = sort(setunion(
    [
      local.webhook_trigger_dockerfile_path
    ],
    [for f in fileset("${local.webhook_trigger_path}", "**") : "${local.webhook_trigger_path}/${f}"],
  ))
  webhook_trigger_hash               = md5(join("_", [for i in local.webhook_trigger_files : filemd5(i)]))
  webhook_trigger_image_name         = "webhook-trigger"
  webhook_trigger_image_name_service = "webhook-trigger-service"
  webhook_trigger_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.webhook_trigger_image_name}:${local.webhook_trigger_hash}"

  webhook_trigger_env = {
    NODE_ENV                 = var.environment
    LOG_LEVEL                = var.is_production ? "info" : "debug"
    PORT                     = "8080"
    DB_TYPE                  = "mongodb"
    DB_URI                   = var.db_uri
    DEST_DB_URI              = var.dest_db_uri
    BROKER_TYPE              = "kafka"
    BROKER_URIS              = var.broker_uris
    KAFKA_CLIENT_ID          = "webhook-trigger"
    KAFKA_CONSUMER_GROUP_ID  = "webhook-trigger-consumer"
    KAFKA_SSL_ENABLED        = "true"
    KAFKA_SASL_ENABLED       = "true"
    KAFKA_SASL_USERNAME      = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD      = var.kafka_sasl_password
    REDIS_HOST               = var.redis_host
    REDIS_PORT               = var.redis_port
    REDIS_PASSWORD           = var.redis_password
    REDIS_DB = var.redis_db
    REDIS_TLS_ENABLED        = var.redis_tls_enabled
    GOOGLE_CLIENT_ID         = var.google_client_id
    GOOGLE_CLIENT_SECRET     = var.google_client_secret
    WEBHOOK_TRIGGER_BASE_URL = var.webhook_trigger_public_url
    TRIGGER_REDEPLOY         = "false"
  }
}

resource "null_resource" "webhook_trigger_builder" {
  triggers = {
    hash = local.webhook_trigger_hash
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
      DOCKER_FILE_NAME             = local.webhook_trigger_dockerfile_path
      DOCKER_IMAGE_NAME            = local.webhook_trigger_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

}

resource "kubernetes_deployment" "webook_trigger" {
  depends_on = [
    null_resource.webhook_trigger_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]

  metadata {
    name      = local.webhook_trigger_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.webhook_trigger_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_webhook_trigger.replicas

    selector {
      match_labels = {
        app = local.webhook_trigger_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.webhook_trigger_image_name
        }
      }
      spec {
        container {
          name  = local.webhook_trigger_image_name
          image = local.webhook_trigger_image_url

          dynamic "env" {
            for_each = { for k, v in local.webhook_trigger_env : k => v }
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
              cpu    = var.k8s_deployment_webhook_trigger.limits.cpu
              memory = var.k8s_deployment_webhook_trigger.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_webhook_trigger.requests.cpu
              memory = var.k8s_deployment_webhook_trigger.requests.memory
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

resource "kubernetes_service" "webhook_trigger_service" {
  depends_on = [kubernetes_deployment.webook_trigger, kubernetes_namespace.namespace]
  metadata {
    name      = local.webhook_trigger_image_name_service
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.webhook_trigger_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.webook_trigger.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}

# resource "kubernetes_manifest" "webhook_trigger_ingress" {
  # depends_on = [kubernetes_service.webhook_trigger_service, kubernetes_manifest.cert_issuer_sync]
  # manifest = {
    # apiVersion = "networking.k8s.io/v1"
    # kind       = "Ingress"
    # metadata = {
      # name      = "webhook-trigger-ingress"
      # namespace = kubernetes_namespace.namespace.metadata.0.name
      # annotations = {
        # "kubernetes.io/ingress.class"                 = "nginx"
        # "nginx.ingress.kubernetes.io/proxy-body-size" = "0"
        # "cert-manager.io/cluster-issuer"              = var.letsencrypt_cluster_issuer_name
      # }
    # }
    # spec = {
      # ingressClassName = "nginx"
      # tls = [{
        # hosts      = [var.webhook_trigger_domain]
        # secretName = "${var.letsencrypt_cluster_issuer_name}-webhook-trigger"
      # }]
      # rules = [{
        # host = var.webhook_trigger_domain
        # http = {
          # paths = [{
            # path     = "/"
            # pathType = "Prefix"
            # backend = {
              # service = {
                # name = kubernetes_service.webhook_trigger_service.metadata[0].name
                # port = {
                  # number = 8080
                # }
              # }
            # }
          # }]
        # }
      # }]
    # }
  # }
# }
