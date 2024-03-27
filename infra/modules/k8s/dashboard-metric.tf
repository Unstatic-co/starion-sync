###
# Create a new Kubernetes namespace for the application deployment
###
resource "kubernetes_namespace" "kubernetes_dashboard" {
  metadata {
    name = "kubernetes-dashboard"
  }
}

# resource "kubernetes_service_account" "admin_user" {
#   metadata {
#     name      = "admin-user"
#     namespace = "kubernetes-dashboard"
#   }

#   automount_service_account_token = true
# }

# resource "kubernetes_cluster_role_binding" "admin_user" {
#   metadata {
#     name = "admin-user"
#   }

#   role_ref {
#     api_group = "rbac.authorization.k8s.io"
#     kind      = "ClusterRole"
#     name      = "cluster-admin"
#   }

#   subject {
#     kind      = "ServiceAccount"
#     name      = kubernetes_service_account.admin_user.metadata[0].name
#     namespace = kubernetes_service_account.admin_user.metadata[0].namespace
#   }
# }

resource "kubectl_manifest" "service_account_dashboard" {
  yaml_body = <<YAML
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: ${kubernetes_namespace.kubernetes_dashboard.metadata[0].name}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: ${kubernetes_namespace.kubernetes_dashboard.metadata[0].name}
YAML
}


###
# Install the Kubernetes Dashboard using the Helm provider
###
resource "helm_release" "kubernetes_dashboard" {
  # Name of the release in the cluster
  name = "kubernetes-dashboard"

  # Name of the chart to install
  repository = "https://kubernetes.github.io/dashboard/"

  # Version of the chart to use
  chart = "kubernetes-dashboard"

  # Wait for the Kubernetes namespace to be created
  depends_on = [kubernetes_namespace.kubernetes_dashboard, kubectl_manifest.service_account_dashboard]

  # Set the namespace to install the release into
  namespace = kubernetes_namespace.kubernetes_dashboard.metadata[0].name

  set {
    name  = "service.type"
    value = "ClusterIP"
  }

  # Set service external port to 9080
  set {
    name  = "service.externalPort"
    value = "9080"
  }

  #   # Set protocol to HTTP (not HTTPS)
  #   set {
  #     name  = "protocolHttp"
  #     value = "true"
  #   }

  # Enable insecure login (no authentication)
  #   set {
  #     name  = "enableInsecureLogin"
  #     value = "true"
  #   }

  # Enable cluster read only role (no write access) for the dashboard user
  set {
    name  = "rbac.clusterReadOnlyRole"
    value = "true"
  }

  # Enable metrics scraper (required for the CPU and memory usage graphs)
  set {
    name  = "metricsScraper.enabled"
    value = "true"
  }

  // set limit cpu and memory
  set {
    name  = "resources.limits.cpu"
    value = "200m"
  }
  set {
    name  = "resources.limits.memory"
    value = "400Mi"
  }
  set {
    name  = "resources.requests.cpu"
    value = "100m"
  }
  set {
    name  = "resources.requests.memory"
    value = "200Mi"
  }
  // set replica count to 1
  set {
    name  = "app.scaling.replicas"
    value = "1"
  }

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = "admin-user" #kubernetes_service_account.admin_user.metadata[0].name
  }

  # Wait for the release to be deployed
  wait = true
}

###
# Install the Metrics Server using the Helm provider
###
resource "helm_release" "metrics_server" {
  # Name of the release in the cluster
  name = "metrics-server"

  # Name of the chart to install
  repository = "https://kubernetes-sigs.github.io/metrics-server/"

  # Version of the chart to use
  chart = "metrics-server"

  # Wait for the Kubernetes Dashboard and Kubernetes namespace to be created
  depends_on = [helm_release.kubernetes_dashboard, kubernetes_namespace.kubernetes_dashboard]

  # Set the namespace to install the release into
  namespace = kubernetes_namespace.kubernetes_dashboard.metadata[0].name

  # Recent updates to the Metrics Server do not work with self-signed certificates by default.
  # Since Docker For Desktop uses such certificates, you’ll need to allow insecure TLS
  set {
    name  = "args"
    value = "{--kubelet-insecure-tls=true}"
  }
  # set replica count to 1
  set {
    name  = "replicas"
    value = "1"
  }

  set {
    name  = "apiService.create"
    value = "true"
  }

  set {
    name  = "resources.limits.cpu"
    value = "100m"
  }

  set {
    name  = "resources.limits.memory"
    value = "128Mi"
  }

  set {
    name  = "resources.requests.cpu"
    value = "10m"
  }

  set {
    name  = "resources.requests.memory"
    value = "32Mi"
  }
  # Wait for the release to be deployed
  wait = true
}

# Output metadata of the Kubernetes Dashboard release
output "kubernetes_dashboard_service_metadata" {
  value = helm_release.kubernetes_dashboard.metadata
}

# Output metadata of the Metrics Server release
output "metrics_server_service_metadata" {
  value = helm_release.metrics_server.metadata
}

# Output the URL of the Kubernetes Dashboard
output "kubernetes_dashboard_url" {
  value = "http://localhost:9080"
}
