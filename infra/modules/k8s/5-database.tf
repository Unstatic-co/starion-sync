resource "helm_release" "mongodb" {
  count      = local.mongodb_count
  name       = "mongodb-replicaset"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "mongodb"
  version    = "14.7.0" # specify the version you want
  timeout    = 1200

  set {
    name  = "architecture"
    value = "replicaset"
  }

  set {
    name  = "replicaSet.enabled"
    value = "true"
  }

  set {
    name  = "replicaCount"
    value = "1" #"2"
  }

  set {
    name  = "auth.enabled"
    value = "true"
  }

  set {
    name  = "auth.rootUser"
    value = "root${var.mongodb_user}"
  }
  set {
    name  = "auth.rootPassword"
    value = "rootpassword${var.mongodb_password}"
  }

  set {
    name  = "auth.username"
    value = var.mongodb_user
  }

  set {
    name  = "auth.password"
    value = var.mongodb_password
  }

  set {
    name  = "auth.database"
    value = "admin"
  }

  set {
    name  = "persistence.enabled"
    value = "true"
  }

  set {
    name  = "persistence.size"
    value = "8Gi"
  }
  set {
    name  = "resources.limits.cpu"
    value = "500m"
  }
  set {
    name  = "resources.limits.memory"
    value = "1Gi"
  }
  set {
    name  = "resources.requests.cpu"
    value = "100m"
  }
  set {
    name  = "resources.requests.memory"
    value = "512Mi"
  }

  set {
    name  = "readinessProbe.initialDelaySeconds"
    value = 240
  }

  # set {
  #   name  = "metrics.readinessProbe.initialDelaySeconds"
  #   value = 240
  # }

  # set {
  #   name  = "livenessProbe.initialDelaySeconds"
  #   value = 240
  # }

  # set {
  #   name  = "metrics.livenessProbe.initialDelaySeconds"
  #   value = 240
  # }

}

resource "helm_release" "redis" {
  count            = local.redis_count
  name             = "redisdb"
  repository       = "https://charts.bitnami.com/bitnami"
  chart            = "redis"
  version          = "18.8.0"
  create_namespace = true
  set {
    name  = "architecture"
    value = "standalone"
  }

  set {
    name  = "auth.password"
    value = var.redis_password
  }

  set {
    name  = "auth.enabled"
    value = "true"
  }

  set {
    name  = "master.persistence.enabled"
    value = "true"
  }

  set {
    name  = "master.persistence.size"
    value = "8Gi"
  }
  set {
    name  = "master.resources.limits.cpu"
    value = "100m"
  }
  set {
    name  = "master.resources.limits.memory"
    value = "128Mi"
  }
  set {
    name  = "master.resources.requests.cpu"
    value = "50m"
  }
  set {
    name  = "master.resources.requests.memory"
    value = "64Mi"
  }

  #   set {
  #     name  = "replica.kind"
  #     value = "StatefulSet"
  #   }

  #   set {
  #     name  = "replica.replicaCount"
  #     value = "2"
  #   }
}

resource "helm_release" "postgresql" {
  count      = local.postgres_count
  name       = "postgresdb"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"

  set {
    name  = "global.postgresql.auth.username"
    value = var.postgres_user
  }

  set {
    name  = "global.postgresql.auth.postgresPassword"
    value = var.postgres_password
  }

  set {
    name  = "global.postgresql.auth.database"
    value = "mydatabase"
  }

  set {
    name  = "primary.persistence.enabled"
    value = "true"
  }

  set {
    name  = "primary.persistence.size"
    value = "10Gi"
  }
  set {
    name  = "primary.resources.limits.cpu"
    value = "200m"
  }
  set {
    name  = "primary.resources.limits.memory"
    value = "256Mi"
  }
  set {
    name  = "primary.resources.requests.cpu"
    value = "100m"
  }
  set {
    name  = "primary.resources.requests.memory"
    value = "128Mi"
  }

}
