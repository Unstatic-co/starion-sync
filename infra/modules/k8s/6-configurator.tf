locals {
  configurator_path            = abspath("${path.root}/../apps/configurator")
  configurator_dockerfile_path = abspath("${local.configurator_path}/Dockerfile")
  configurator_files = sort(setunion(
    [
      local.configurator_dockerfile_path
    ],
    [for f in fileset("${local.configurator_path}", "**") : "${local.configurator_path}/${f}"],
  ))
  configurator_hash               = md5(join("_", [for i in local.configurator_files : filemd5(i)]))
  configurator_image_name         = "configurator"
  configurator_image_name_service = "configurator-service"
  configurator_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.configurator_image_name}:${local.configurator_hash}"
  configurator_env = {
    NODE_ENV                       = var.environment
    PORT                           = "8080"
    LOG_LEVEL                      = var.is_production ? "info" : "debug"
    BROKER_URIS                    = var.broker_uris
    DB_TYPE                        = "mongodb"
    DB_URI                         = var.db_uri
    DEST_DB_URI                    = var.dest_db_uri
    DEST_DB_SCHEMA = var.dest_db_schema
    BROKER_TYPE                    = "kafka"
    KAFKA_CLIENT_ID                = "configurator"
    KAFKA_CONSUMER_GROUP_ID        = "configurator-consumer"
    KAFKA_SSL_ENABLED              = "true"
    KAFKA_SASL_ENABLED             = "true"
    KAFKA_SASL_USERNAME            = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD            = var.kafka_sasl_password
    ORCHESTRATOR_ADDRESS           = var.orchestrator_address
    ORCHESTRATOR_NAMESPACE         = var.orchestrator_namespace
    ORCHESTRATOR_WORKER_TASKQUEUE  = "configurator"
    ORCHESTRATOR_DEFAULT_TASKQUEUE = "configurator"
    ORCHESTRATOR_TLS_ENABLED       = var.orchestrator_tls_enabled
    ORCHESTRATOR_CLIENT_CERT       = var.orchestrator_client_cert
    ORCHESTRATOR_CLIENT_KEY        = var.orchestrator_client_key
    API_KEYS                       = join(",", var.api_keys)
    MICROSOFT_CLIENT_ID            = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET        = var.microsoft_client_secret
    GOOGLE_CLIENT_ID               = var.google_client_id
    GOOGLE_CLIENT_SECRET           = var.google_client_secret
    TRIGGER_REDEPLOY               = "true"
  }
}

resource "null_resource" "configurator_builder" {
  triggers = {
    hash = local.configurator_hash
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
      DOCKER_FILE_NAME             = local.configurator_dockerfile_path
      DOCKER_IMAGE_NAME            = local.configurator_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")

  }

}

resource "kubernetes_deployment" "configurator" {
  depends_on = [
    null_resource.configurator_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.configurator_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.configurator_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_configurator.replicas

    selector {
      match_labels = {
        app = local.configurator_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.configurator_image_name
        }
      }
      spec {
        container {
          name  = local.configurator_image_name
          image = local.configurator_image_url

          dynamic "env" {
            for_each = { for k, v in local.configurator_env : k => v }
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
              cpu    = var.k8s_deployment_configurator.limits.cpu
              memory = var.k8s_deployment_configurator.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_configurator.requests.cpu
              memory = var.k8s_deployment_configurator.requests.memory
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

resource "kubernetes_service" "configurator_service" {
  depends_on = [kubernetes_deployment.configurator, kubernetes_namespace.namespace]
  metadata {
    name      = local.configurator_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.configurator_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.configurator.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_manifest" "configurator_ingress" {
  depends_on = [kubernetes_service.configurator_service, kubernetes_manifest.cert_issuer_sync]
  manifest = {
    apiVersion = "networking.k8s.io/v1"
    kind       = "Ingress"
    metadata = {
      name      = "configurator-ingress"
      namespace = kubernetes_namespace.namespace.metadata.0.name
      annotations = {
        "kubernetes.io/ingress.class"                 = "nginx"
        "nginx.ingress.kubernetes.io/proxy-body-size" = "0"
        "cert-manager.io/cluster-issuer"              = var.letsencrypt_cluster_issuer_name
      }
    }
    spec = {
      ingressClassName = "nginx"
      tls = [{
        hosts      = [var.configurator_domain]
        secretName = "${var.letsencrypt_cluster_issuer_name}-configurator"
      }]
      rules = [{
        host = var.configurator_domain
        http = {
          paths = [{
            path     = "/"
            pathType = "Prefix"
            backend = {
              service = {
                name = kubernetes_service.configurator_service.metadata[0].name
                port = {
                  number = 8080
                }
              }
            }
          }]
        }
      }]
    }
  }
}
