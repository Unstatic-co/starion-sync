locals {
  controller_path            = abspath("${path.root}/../apps/controller")
  controller_dockerfile_path = abspath("${local.controller_path}/Dockerfile")
  controller_files = sort(setunion(
    [
      local.controller_dockerfile_path
    ],
    [for f in fileset("${local.controller_path}", "**") : "${local.controller_path}/${f}"],
  ))
  controller_hash               = md5(join("_", [for i in local.controller_files : filemd5(i)]))
  controller_image_name         = "controller"
  controller_image_name_service = "controller-service"
  controller_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.controller_image_name}:${local.controller_hash}"
  controller_env = {
    NODE_ENV                       = var.environment
    LOG_LEVEL                      = var.is_production ? "info" : "debug"
    BROKER_URIS                    = var.broker_uris
    DB_TYPE                        = "mongodb"
    DB_URI                         = var.db_uri
    BROKER_TYPE                    = "kafka"
    KAFKA_CLIENT_ID                = "controller"
    KAFKA_CONSUMER_GROUP_ID        = "controller-consumer"
    KAFKA_SSL_ENABLED              = "true"
    KAFKA_SASL_ENABLED             = "true"
    KAFKA_SASL_USERNAME            = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD            = var.kafka_sasl_password
    ORCHESTRATOR_ADDRESS           = var.orchestrator_address
    ORCHESTRATOR_NAMESPACE         = var.orchestrator_namespace
    ORCHESTRATOR_WORKER_TASKQUEUE  = "controller"
    ORCHESTRATOR_DEFAULT_TASKQUEUE = "controller"
    ORCHESTRATOR_TLS_ENABLED       = var.orchestrator_tls_enabled
    ORCHESTRATOR_CLIENT_CERT       = var.orchestrator_client_cert
    ORCHESTRATOR_CLIENT_KEY        = var.orchestrator_client_key
    MICROSOFT_CLIENT_ID            = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET        = var.microsoft_client_secret
    GOOGLE_CLIENT_ID               = var.google_client_id
    GOOGLE_CLIENT_SECRET           = var.google_client_secret
    TRIGGER_RESTART                = "true",
    IGNORE_WORKFLOW_TRIGGERED      = "false"
  }
}

resource "null_resource" "controller_builder" {
  triggers = {
    hash = local.controller_hash
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
      DOCKER_FILE_NAME             = local.controller_dockerfile_path
      DOCKER_IMAGE_NAME            = local.controller_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

}

resource "kubernetes_deployment" "controller" {
  depends_on = [
    null_resource.controller_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.controller_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.controller_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_controller.replicas

    selector {
      match_labels = {
        app = local.controller_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.controller_image_name
        }
      }
      spec {
        container {
          name  = local.controller_image_name
          image = local.controller_image_url

          dynamic "env" {
            for_each = { for k, v in local.controller_env : k => v }
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
              cpu    = var.k8s_deployment_controller.limits.cpu
              memory = var.k8s_deployment_controller.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_controller.requests.cpu
              memory = var.k8s_deployment_controller.requests.memory
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

resource "kubernetes_service" "controller_service" {
  depends_on = [kubernetes_deployment.controller, kubernetes_namespace.namespace]
  metadata {
    name      = local.controller_image_name_service
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.controller_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.controller.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}
