resource "kubernetes_namespace" "namespace" {
  metadata {
    name = var.k8s_namespace
  }
}

resource "kubernetes_secret" "artifact_registry_secret" {
  metadata {
    name      = "${var.project}-${var.environment}-artifact-secret"
    namespace = kubernetes_namespace.namespace.metadata.0.name
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
  depends_on = [kubernetes_namespace.namespace]

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