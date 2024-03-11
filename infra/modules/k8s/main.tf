locals {
  test_app_count        = var.is_production ? 0 : 0
  redis_count           = var.is_production ? 0 : 1
  mongodb_count         = var.is_production ? 0 : 1
  postgres_count        = var.is_production ? 0 : 0
  apps_count            = var.is_production ? 0 : 1
  cron_trigger_count    = var.is_production ? 1 : 0
  configurator_count    = var.is_production ? 1 : 1
  controller_count      = var.is_production ? 1 : 0
  worker_count          = var.is_production ? 1 : 0
  post_processor_count  = var.is_production ? 1 : 0
  webhook_count         = var.is_production ? 1 : 0
  webhook_trigger_count = var.is_production ? 1 : 1
  formsync_count        = var.is_production ? 1 : 1
  rate_limiter_count    = var.is_production ? 0 : 0
}

locals {
  redis_host        = !var.is_production ? "redisdb-headless.default.svc.cluster.local" : var.redis_host
  redis_port        = !var.is_production ? "6379" : var.redis_port
  redis_password    = !var.is_production ? var.redis_password : var.redis_password
  redis_tls_enabled = !var.is_production ? "false" : "true"
  downloader_url    = var.downloader_url
  comparer_url      = var.comparer_url
  loader_url        = var.loader_url
  metadata_url      = var.metadata_url

  # public url : formsync, trigger, configurator
  configurator_url         = var.is_production ? "https://sync-configurator.starion.io" : "https://sync-configurator.starion-stagging.com"
  webhook_trigger_base_url = var.is_production ? "https://sync-webhook-trigger.starion.io" : "https://sync-webhook-trigger.starion-stagging.com" # "https://${local.webhook_trigger_app_name}.fly.dev"
}

locals {
  redis_app_name    = "${var.project}-${var.environment}-redis"
  mongodb_app_name  = "${var.project}-${var.environment}-mongodb"
  postgres_app_name = "${var.project}-${var.environment}-postgres"

  configurator_app_name    = "${var.project}-${var.environment}-configurator"
  controller_app_name      = "${var.project}-${var.environment}-controller"
  worker_app_name          = "${var.project}-${var.environment}-worker"
  post_processor_app_name  = "${var.project}-${var.environment}-post-processor"
  webhook_app_name         = "${var.project}-${var.environment}-webhook"
  cron_trigger_app_name    = "${var.project}-${var.environment}-cron-trigger"
  webhook_trigger_app_name = "${var.project}-${var.environment}-webhook-trigger"
  formsync_app_name        = "${var.project}-${var.environment}-formsync"
  apps_app_name            = "${var.project}-${var.environment}-apps"

  rate_limiter_app_name = "${var.project}-${var.environment}-rate-limiter"

  test_app_name = "${var.project}-${var.environment}-test-app"
}

resource "kubernetes_namespace" "backend_sync_app" {
  metadata {
    name = "backend-sync-app"
  }
}

resource "kubernetes_secret" "artifact_registry_secret" {
  metadata {
    name      = "backend-sync-app-artifact-secret"
    namespace = kubernetes_namespace.backend_sync_app.metadata.0.name
  }
  data = {
    ".dockerconfigjson" = jsonencode({
      "auths" = {
        "https://us-central1-docker.pkg.dev" = {
          "username" = "_json_key"
          "password" = var.GOOGLE_CREDENTIALS
          "email"    = "not@val.id"
          "auth"     = base64encode("_json_key:${var.GOOGLE_CREDENTIALS}")
        }
      }
    })
  }

  type = "kubernetes.io/dockerconfigjson"
}

resource "kubernetes_manifest" "cert_issuer_sync" {
  depends_on = [kubernetes_namespace.backend_sync_app]

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = var.letsencrypt_cluster_issuer_name
    }
    spec = {
      acme = {
        email  = var.letsencrypt_email
        server = "https://acme-v02.api.letsencrypt.org/directory"
        privateKeySecretRef = {
          name = "${var.letsencrypt_cluster_issuer_name}-cluster-secret"
        }
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }
}

resource "random_shuffle" "processor_api_key" {
  input        = var.processor_api_keys
  result_count = 1
}

resource "random_shuffle" "configurator_api_key" {
  input        = var.api_keys
  result_count = 1
}
