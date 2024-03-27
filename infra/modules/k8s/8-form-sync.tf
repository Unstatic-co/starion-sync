locals {
  formsync_path            = abspath("${path.root}/../form-sync/main")
  formsync_dockerfile_path = abspath("${local.formsync_path}/Dockerfile")
  formsync_files = sort(setunion(
    [
      local.formsync_dockerfile_path
    ],
    [for f in fileset("${local.formsync_path}", "**") : "${local.formsync_path}/${f}"],
  ))
  formsync_hash               = md5(join("_", [for i in local.formsync_files : filemd5(i)]))
  formsync_image_name         = "formsync"
  formsync_image_name_service = "formsync-service"
  formsync_image_url          = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project}/${var.gcp_docker_repository_name}/${local.formsync_image_name}:${local.formsync_hash}"

  formsync_env = {
    NODE_ENV                = var.environment
    PORT                    = "8080"
    LOG_LEVEL               = var.is_production ? "debug" : "debug"
    API_KEYS                = join(",", var.api_keys)
    DB_URI                  = var.formsync_db_uri
    DB_SCHEMA = var.formsync_db_schema
    DB_TLS_ENABLED          = "true"
    METADATA_DB_URI         = var.metadata_db_uri
    REDIS_HOST               = var.redis_host
    REDIS_PORT               = var.redis_port
    REDIS_PASSWORD           = var.redis_password
    REDIS_DB = var.redis_db
    REDIS_TLS_ENABLED        = var.redis_tls_enabled
    METADATA_HOST_URL       = var.metadata_url
    STARION_SYNC_BASE_URL   = var.configurator_public_url
    WEBHOOK_PUBLIC_KEY      = var.webhook_public_key
    STARION_SYNC_API_KEY    = random_shuffle.configurator_api_key.result[0]
    MICROSOFT_CLIENT_ID     = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET = var.microsoft_client_secret
    GOOGLE_CLIENT_ID        = var.google_client_id
    GOOGLE_CLIENT_SECRET    = var.google_client_secret
    TRIGGER_REDEPLOY        = "true"
  }
}

resource "null_resource" "formsync_builder" {
  triggers = {
    hash = local.formsync_hash
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
      DOCKER_FILE_NAME             = local.formsync_dockerfile_path
      DOCKER_IMAGE_NAME            = local.formsync_image_name
      DOCKER_IMAGE_DIGEST          = self.triggers.hash
    }
    working_dir = local.formsync_path
  }
}

resource "kubernetes_deployment" "formsync" {
  depends_on = [
    null_resource.formsync_builder,
    kubernetes_namespace.namespace,
    kubernetes_secret.artifact_registry_secret
  ]
  metadata {
    name      = local.formsync_image_name
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.formsync_image_name
    }
  }
  spec {
    replicas = var.k8s_deployment_formsync.replicas

    selector {
      match_labels = {
        app = local.formsync_image_name
      }
    }
    template {
      metadata {
        labels = {
          app = local.formsync_image_name
        }
      }
      spec {
        container {
          name  = local.formsync_image_name
          image = local.formsync_image_url

          dynamic "env" {
            for_each = { for k, v in local.formsync_env : k => v }
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
              cpu    = var.k8s_deployment_formsync.limits.cpu
              memory = var.k8s_deployment_formsync.limits.memory
            }
            requests = {
              cpu    = var.k8s_deployment_formsync.requests.cpu
              memory = var.k8s_deployment_formsync.requests.memory
            }
          }

        }
        image_pull_secrets {
          name = kubernetes_secret.artifact_registry_secret.metadata.0.name
        }

      }

    }
  }
  timeouts {
    create = "10m"
    update = "10m"
    delete = "10m"
  }
}

resource "kubernetes_service" "formsync_service" {
  depends_on = [kubernetes_deployment.formsync, kubernetes_namespace.namespace]
  metadata {
    name      = local.formsync_image_name_service
    namespace = kubernetes_namespace.namespace.metadata.0.name
    labels = {
      app = local.formsync_image_name_service
    }
  }
  spec {
    selector = {
      app = kubernetes_deployment.formsync.spec.0.template.0.metadata.0.labels.app
    }
    port {
      port        = 80
      target_port = 8080
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_manifest" "formsync_ingress" {
  depends_on = [kubernetes_service.formsync_service, kubernetes_manifest.cert_issuer_sync]
  manifest = {
    apiVersion = "networking.k8s.io/v1"
    kind       = "Ingress"
    metadata = {
      name      = "form-ingress"
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
        hosts      = [var.formsync_domain]
        secretName = "${var.letsencrypt_cluster_issuer_name}-formsync"
      }]
      rules = [{
        host = var.formsync_domain
        http = {
          paths = [{
            path     = "/"
            pathType = "Prefix"
            backend = {
              service = {
                name = kubernetes_service.formsync_service.metadata[0].name
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


