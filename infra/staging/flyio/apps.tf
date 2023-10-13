resource "fly_app" "apps" {
  name = "${var.project}-${var.environment}-apps"
  org  = var.organization
}

resource "fly_ip" "apps_ip_v4" {
  app  = fly_app.apps.name
  type = "v4"
}

resource "fly_ip" "apps_ip_v6" {
  app  = fly_app.apps.name
  type = "v6"
}

locals {
  apps_files = [
    "${path.module}/build/apps/Dockerfile",
    "${path.module}/build/apps/apps.json",
  ]
  apps_hash = md5(join("", [for i in local.apps_files : filemd5(i)]))
}

resource "null_resource" "apps_builder" {
  triggers = {
    sha1 = local.apps_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN = var.api_token

      DOCKER_FILE         = abspath("${path.module}/build/apps/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.apps.name
      DOCKER_IMAGE_DIGEST = local.apps_hash

      # ARGS = "--build-arg PASS=${var.redis_password}}"
    }
    working_dir = abspath("${path.root}/../../")
  }
}

resource "fly_machine" "apps" {
  app    = fly_app.apps.name
  region = var.region
  name   = "${var.project}-${var.environment}-apps"

  cpus     = 2
  memorymb = 2048

  image = "registry.fly.io/${fly_app.apps.name}:${local.apps_hash}"

  # lifecycle {
  # prevent_destroy = true
  # }

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port = 8080
        }
      ],
      "internal_port" : 8080,
    }
  ]

  env = {
    NODE_ENV                = var.environment
    LOG_LEVEL               = "error"
    BROKER_URIS             = "intimate-eagle-6706-us1-kafka.upstash.io:9092"
    DB_TYPE                 = "mongodb"
    DB_URI                  = "mongodb://${var.mongodb_user}:${var.mongodb_password}@${fly_ip.mongodb_ip_v4.address}:27017/starion-sync?directConnection=true&authSource=admin"
    DEST_DB_URI             = "postgres://${var.postgres_user}:${var.postgres_password}@${fly_ip.postgres_ip_v4.address}:5432/starion-sync?sslmode=disable"
    BROKER_TYPE             = "kafka"
    KAFKA_SSL_ENABLED       = "true"
    KAFKA_SASL_ENABLED      = "true"
    KAFKA_SASL_USERNAME     = "aW50aW1hdGUtZWFnbGUtNjcwNiRPYxQX8gnwSox0VLZwUMRHW24Z6BuKIN9ZgCA"
    KAFKA_SASL_PASSWORD     = "MTAwYjQ3ZGYtZTg4ZS00ZjYyLWJkOGMtZjZjZjljMTI1Mzgz"
    REDIS_HOST              = "redis://default:123456@${fly_ip.redis_ip_v4.address}:6379"
    ORCHESTRATOR_ADDRESS    = "65.21.57.51:7233"
    MICROSOFT_CLIENT_ID     = "9b2ff1a2-7ff2-4d1c-a6cb-87e59d6463b7"
    MICROSOFT_CLIENT_SECRET = "tXg8Q~pLOGojmhkBM3tk0sC1VA8EoAfb7jJwIdal"
  }

  depends_on = [
    null_resource.apps_builder,
  ]
}
