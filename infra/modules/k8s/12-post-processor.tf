locals {
  post_processor_path            = abspath("${path.root}/../apps/post-processor")
  post_processor_dockerfile_path = abspath("${local.post_processor_path}/Dockerfile")
  post_processor_files = sort(setunion(
    [
      local.post_processor_dockerfile_path
    ],
    [for f in fileset("${local.post_processor_path}", "**") : "${local.post_processor_path}/${f}"],
  ))
  post_processor_hash               = md5(join("_", [for i in local.post_processor_files : filemd5(i)]))
  post_processor_image_name         = "post-processor"
  post_processor_image_name_service = "post-processor-service"
  post_processor_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.post_processor_image_name}:${local.post_processor_hash}"

  post_processor_env = {
    NODE_ENV                              = var.environment
    LOG_LEVEL                             = var.is_production ? "info" : "debug"
    BROKER_URIS                           = var.broker_uris
    DB_TYPE                               = "mongodb"
    DB_URI                                = var.db_uri
    BROKER_TYPE                           = "kafka"
    KAFKA_CLIENT_ID                       = "post-processor"
    KAFKA_CONSUMER_GROUP_ID               = "post-processor-consumer"
    KAFKA_SSL_ENABLED                     = "true"
    KAFKA_SASL_ENABLED                    = "true"
    KAFKA_SASL_USERNAME                   = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD                   = var.kafka_sasl_password
    ORCHESTRATOR_ADDRESS                  = var.orchestrator_address
    ORCHESTRATOR_NAMESPACE                = var.orchestrator_namespace
    ORCHESTRATOR_post-processor_TASKQUEUE = "post-processor"
    ORCHESTRATOR_DEFAULT_TASKQUEUE        = "post-processor"
    ORCHESTRATOR_TLS_ENABLED              = var.orchestrator_tls_enabled
    ORCHESTRATOR_CLIENT_CERT              = var.orchestrator_client_cert
    ORCHESTRATOR_CLIENT_KEY               = var.orchestrator_client_key
    S3_URL                                = var.s3_endpoint
    S3_REGION                             = var.s3_region
    S3_DIFF_DATA_BUCKET                   = var.s3_bucket
    S3_ACCESS_KEY                         = var.s3_access_key
    S3_SECRET_KEY                         = var.s3_secret_key
    TRIGGER_REDEPLOY                      = "true"
  }
}

resource "null_resource" "post_processor_builder" {
  triggers = {
    hash = local.post_processor_hash
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
      DOCKER_FILE_NAME             = local.post_processor_dockerfile_path
      DOCKER_IMAGE_NAME            = local.post_processor_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

}

resource "kubernetes_deployment" "post_processor" {
  depends_on = [
    null_resource.post_processor_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.post_processor_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.post_processor_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_post_processor.replicas

    selector {
      match_labels = {
        app = local.post_processor_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.post_processor_image_name
        }
      }
      spec {
        container {
          name  = local.post_processor_image_name
          image = local.post_processor_image_url

          dynamic "env" {
            for_each = { for k, v in local.post_processor_env : k => v }
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
              cpu    = var.k8s_deployment_post_processor.limits.cpu
              memory = var.k8s_deployment_post_processor.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_post_processor.requests.cpu
              memory = var.k8s_deployment_post_processor.requests.memory
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

resource "kubernetes_service" "post_processor_service" {
  depends_on = [kubernetes_deployment.post_processor, kubernetes_namespace.namespace]
  metadata {
    name      = local.post_processor_image_name_service
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.post_processor_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.post_processor.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}

