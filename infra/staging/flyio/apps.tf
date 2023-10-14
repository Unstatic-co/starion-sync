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
      FLY_ACCESS_TOKEN = var.fly_api_token

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
          port : 443,
          handlers : [
            "tls",
            "http"
          ]
        },
        {
          "port" : 80,
          "handlers" : [
            "http"
          ]
        }
      ],
      "internal_port" : 8080,
    }
  ]

  env = {
    NODE_ENV                = var.environment
    LOG_LEVEL               = "warn"
    API_KEYS                = "api-key"
    BROKER_URIS             = var.broker_uris
    DB_TYPE                 = "mongodb"
    DB_URI                  = "mongodb://${var.mongodb_user}:${var.mongodb_password}@${fly_ip.mongodb_ip_v4.address}:27017/starion-sync?directConnection=true&authSource=admin"
    DEST_DB_URI             = "postgres://${var.postgres_user}:${var.postgres_password}@${fly_ip.postgres_ip_v4.address}:5432/starion-sync?sslmode=disable"
    BROKER_TYPE             = "kafka"
    KAFKA_SSL_ENABLED       = "true"
    KAFKA_SASL_ENABLED      = "true"
    KAFKA_SASL_USERNAME     = "bWFzc2l2ZS1tYWdwaWUtMTIzNDQkMRlXwhjf1CjZb894Nu3jcbQ_JfkP4ROQOyg"
    KAFKA_SASL_PASSWORD     = "OWFiNmJlOTAtN2RjZS00YzU5LWEzNmMtNzA5OTgyYWE5NDcw"
    REDIS_HOST              = "redis://default:123456@${fly_ip.redis_ip_v4.address}:6379"
    ORCHESTRATOR_ADDRESS    = var.orchestrator_address
    MICROSOFT_CLIENT_ID     = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET = var.microsoft_secret_id
    GOOGLE_CLIENT_ID        = var.google_client_id
    GOOGLE_CLIENT_SECRET    = var.google_secret_id
  }

  depends_on = [
    null_resource.apps_builder,
    fly_machine.redis,
    fly_machine.postgres,
    fly_machine.mongodb,
  ]
}
