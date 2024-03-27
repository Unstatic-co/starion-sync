# cert-manager resources
resource "kubernetes_namespace" "cert_manager" {
  metadata {
    labels = {
      "name" = "cert-manager"
    }
    name = "cert-manager"
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  # chart = "./charts/cert-manager"
  # version    = "1.11.0"
  # version          = "v1.13.3"
  # wait             = true
  # create_namespace = false
  # force_update     = true
  # replace          = true
  timeout = 1200
  # namespace = "kube-system"
  namespace = kubernetes_namespace.cert_manager.metadata.0.name
  #   set {
  #     name  = "createCustomResource"
  #     value = "true"
  #   }
  set {
    name  = "installCRDs"
    value = "true"
  }

  set {
    name  = "controller.resources.limits.cpu"
    value = "500m"
  }

  set {
    name  = "controller.resources.limits.memory"
    value = "256Mi"
  }

  set {
    name  = "controller.resources.requests.cpu"
    value = "100m"
  }

  set {
    name  = "controller.resources.requests.memory"
    value = "128Mi"
  }
  depends_on = [kubernetes_namespace.cert_manager]
}


# resource "helm_release" "cluster-issuer" {
#   name      = "cluster-issuer"
#   chart     = "../helm_charts/cluster-issuer"
#   namespace = "kube-system"
#   depends_on = [
#     helm_release.cert_manager,
#   ]
#   set {
#     name  = "letsencrypt_email"
#     value = var.letsencrypt_email
#   }
# }

# locals {
#   clusterissuer = "${path.module}/cert-manager/clusterissuer-nginx.yaml"
# }

# # Create clusterissuer for nginx YAML file
# data "kubectl_file_documents" "clusterissuer" {
#   content = file(local.clusterissuer)
# }

# data "http" "cert_manager" {
#   url = "https://github.com/jetstack/cert-manager/releases/download/v1.13.3/cert-manager.yaml"
# }

# resource "kubectl_manifest" "cert_manager" {
#   yaml_body = data.http.cert_manager.body
# }

