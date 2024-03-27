
resource "kubernetes_namespace" "ingress" {
  metadata {
    name = "nginx-ingress"
  }
}

resource "helm_release" "nginx_ingress_controller" {
  name       = "nginx-ingress-controller"
  namespace  = kubernetes_namespace.ingress.metadata.0.name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "nginx-ingress-controller"
  timeout    = 600
  set {
    name  = "service.type"
    value = "LoadBalancer"
  }
  set {
    name  = "replicaCount"
    value = "1"
  }

  # auto sclaing
  set {
    name  = "autoscaling.enabled"
    value = "true"
  }
  set {
    name  = "autoscaling.minReplicas"
    value = "1"
  }
  set {
    name  = "autoscaling.maxReplicas"
    value = "5"
  }
  set {
    name  = "autoscaling.targetCPU"
    value = "80"
  }
  set {
    name  = "autoscaling.targetMemory"
    value = "80"
  }
  set {
    name  = "controller.config.enable-gzip"
    value = "true"
  }
  set {
    name  = "resources.limits.cpu"
    value = "1000m"
  }
  set {
    name  = "resources.limits.memory"
    value = "2Gi"
  }
  set {
    name  = "resources.requests.cpu"
    value = "500m"
  }
  set {
    name  = "resources.requests.memory"
    value = "512Mi"
  }
}
