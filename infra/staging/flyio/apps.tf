locals {
  db_uri          = "mongodb://${var.mongodb_user}:${var.mongodb_password}@${fly_ip.mongodb_ip_v4.address}:27017/starion-sync?directConnection=true&replicaSet=rs0&authSource=admin"
  metadata_db_uri = "mongodb://${var.mongodb_user}:${var.mongodb_password}@${fly_ip.mongodb_ip_v4.address}:27017/starion-form-sync?directConnection=true&replicaSet=rs0&authSource=admin"
  # dest_db_uri              = "postgres://${var.postgres_user}:${var.postgres_password}@${fly_ip.postgres_ip_v4.address}:5432/starion-sync?sslmode=disable"
  dest_db_uri = var.dest_db_uri
  # downloader_url           = "https://${fly_app.downloader.name}.fly.dev"
  # comparer_url             = "https://${fly_app.comparer.name}.fly.dev"
  # loader_url               = "https://${fly_app.loader.name}.fly.dev"
  # metadata_url             = "https://${fly_app.metadata.name}.fly.dev"
  configurator_url         = "https://${fly_app.apps.name}.fly.dev"
  webhook_trigger_base_url = "https://${fly_app.webhook_trigger.name}.fly.dev"
}

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
  configurator_path   = "${path.root}/../../apps/configurator"
  controller_path     = "${path.root}/../../apps/controller"
  worker_path         = "${path.root}/../../apps/worker"
  post_processor_path = "${path.root}/../../apps/post-processor"
  webhook_path        = "${path.root}/../../apps/webhook"
  cron_trigger_path   = "${path.root}/../../apps/triggers/cron-trigger"
  apps_files = sort(setunion(
    [
      "${path.module}/build/apps/Dockerfile",
      "${path.module}/build/apps/apps.json",
    ],
    [for f in fileset("${local.configurator_path}", "**") : "${local.configurator_path}/${f}"],
    [for f in fileset("${local.controller_path}", "**") : "${local.controller_path}/${f}"],
    [for f in fileset("${local.worker_path}", "**") : "${local.worker_path}/${f}"],
    [for f in fileset("${local.post_processor_path}", "**") : "${local.post_processor_path}/${f}"],
    [for f in fileset("${local.webhook_path}", "**") : "${local.webhook_path}/${f}"],
    [for f in fileset("${local.cron_trigger_path}", "**") : "${local.cron_trigger_path}/${f}"],
  ))
  apps_hash = md5(join("", [for i in local.apps_files : filemd5(i)]))
}

resource "null_resource" "apps_builder" {
  triggers = {
    hash = local.apps_hash
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

  cputype  = "shared"
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
    LOG_LEVEL               = "debug"
    BROKER_URIS             = var.broker_uris
    DB_TYPE                 = "mongodb"
    DB_URI                  = local.db_uri
    DEST_DB_URI             = local.dest_db_uri
    BROKER_TYPE             = "kafka"
    KAFKA_SSL_ENABLED       = "true"
    KAFKA_SASL_ENABLED      = "true"
    KAFKA_SASL_USERNAME     = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD     = var.kafka_sasl_password
    REDIS_HOST              = fly_ip.redis_ip_v4.address
    REDIS_PORT              = "6379"
    REDIS_PASSWORD          = var.redis_password
    REDIS_TLS_ENABLED       = "false"
    ORCHESTRATOR_ADDRESS    = var.orchestrator_address
    S3_URL                  = var.s3_endpoint
    S3_REGION               = var.s3_region
    S3_DIFF_DATA_BUCKET     = var.s3_bucket
    S3_ACCESS_KEY           = var.s3_access_key
    S3_SECRET_KEY           = var.s3_secret_key
    DOWNLOADER_URL          = var.downloader_url
    COMPARER_URL            = var.comparer_url
    LOADER_URL              = var.loader_url
    API_KEYS                = join(",", var.api_keys)
    PROCESSOR_API_KEY       = random_shuffle.processor_api_key.result[0]
    WEBHOOK_PRIVATE_KEY     = var.webhook_private_key
    WEBHOOK_PUBLIC_KEY      = var.webhook_public_key
    MICROSOFT_CLIENT_ID     = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET = var.microsoft_client_secret
    GOOGLE_CLIENT_ID        = var.google_client_id
    GOOGLE_CLIENT_SECRET    = var.google_client_secret
    TRIGGER_RESTART         = "true"
  }

  depends_on = [
    null_resource.apps_builder,
    fly_machine.redis,
    fly_machine.postgres,
    fly_machine.mongodb,
    null_resource.mongodb_replica_set_setup,
  ]
}

resource "random_shuffle" "processor_api_key" {
  input        = var.processor_api_keys
  result_count = 1
}

// **************************** Webhook Trigger ****************************

resource "fly_app" "webhook_trigger" {
  name = "${var.project}-${var.environment}-webhook-trigger"
  org  = var.organization
}

resource "fly_ip" "webhook_trigger_ip_v4" {
  app  = fly_app.webhook_trigger.name
  type = "v4"
}

resource "fly_ip" "webhook_trigger_ip_v6" {
  app  = fly_app.webhook_trigger.name
  type = "v6"
}

locals {
  webhook_trigger_path = abspath("${path.root}/../../apps/triggers/webhook")
  webhook_trigger_files = sort(setunion(
    [
      "${local.webhook_trigger_path}/Dockerfile",
    ],
    [for f in fileset("${local.webhook_trigger_path}", "**") : "${local.webhook_trigger_path}/${f}"],
  ))
  webhook_trigger_hash = md5(join("", [for i in local.webhook_trigger_files : filemd5(i)]))
}

resource "null_resource" "webhook_trigger_builder" {
  triggers = {
    hash = local.webhook_trigger_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.webhook_trigger_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.webhook_trigger.name
      DOCKER_IMAGE_DIGEST = local.webhook_trigger_hash
    }
    working_dir = abspath("${path.root}/../../")
  }
}

resource "fly_machine" "webhook_trigger" {
  app    = fly_app.webhook_trigger.name
  region = var.region
  name   = "${var.project}-${var.environment}-webhook-trigger"

  cputype  = "shared"
  cpus     = 1
  memorymb = 256

  image = "registry.fly.io/${fly_app.webhook_trigger.name}:${local.webhook_trigger_hash}"

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
    NODE_ENV                 = var.environment
    LOG_LEVEL                = "info"
    PORT                     = "8080"
    DB_TYPE                  = "mongodb"
    DB_URI                   = local.db_uri
    DEST_DB_URI              = local.dest_db_uri
    BROKER_TYPE              = "kafka"
    BROKER_URIS              = var.broker_uris
    KAFKA_SSL_ENABLED        = "true"
    KAFKA_SASL_ENABLED       = "true"
    KAFKA_SASL_USERNAME      = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD      = var.kafka_sasl_password
    REDIS_HOST               = fly_ip.redis_ip_v4.address
    REDIS_PORT               = "6379"
    REDIS_PASSWORD           = var.redis_password
    REDIS_TLS_ENABLED        = "false"
    GOOGLE_CLIENT_ID         = var.google_client_id
    GOOGLE_CLIENT_SECRET     = var.google_client_secret
    WEBHOOK_TRIGGER_BASE_URL = local.webhook_trigger_base_url
  }

  depends_on = [
    null_resource.webhook_trigger_builder,
    fly_machine.redis,
    fly_machine.mongodb,
  ]
}

// **************************** Form Sync ****************************

resource "random_shuffle" "configurator_api_key" {
  input        = var.api_keys
  result_count = 1
}

resource "fly_app" "formsync" {
  name = "${var.project}-${var.environment}-formsync"
  org  = var.organization
}

resource "fly_ip" "formsync_ip_v4" {
  app  = fly_app.formsync.name
  type = "v4"
}

resource "fly_ip" "formsync_ip_v6" {
  app  = fly_app.formsync.name
  type = "v6"
}

locals {
  formsync_path = abspath("${path.root}/../../form-sync/main")
  formsync_files = sort(setunion(
    [
      "${local.formsync_path}/Dockerfile",
    ],
    [for f in fileset("${local.formsync_path}", "**") : "${local.formsync_path}/${f}"],
  ))
  formsync_hash = md5(join("", [for i in local.formsync_files : filemd5(i)]))
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
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.formsync_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.formsync.name
      DOCKER_IMAGE_DIGEST = local.formsync_hash
    }
    working_dir = abspath(local.formsync_path)
  }
}

resource "fly_machine" "formsync" {
  app    = fly_app.formsync.name
  region = var.region
  name   = "${var.project}-${var.environment}-formsync"

  cputype  = "shared"
  cpus     = 1
  memorymb = 256

  image = "registry.fly.io/${fly_app.formsync.name}:${local.formsync_hash}"

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
    PORT                    = "8080"
    API_KEYS                = join(",", var.api_keys)
    DB_URI                  = local.dest_db_uri
    DB_NAME                 = "starion-form-sync"
    METADATA_DB_URI         = local.metadata_db_uri
    REDIS_HOST              = fly_ip.redis_ip_v4.address
    REDIS_PORT              = "6379"
    REDIS_PASSWORD          = var.redis_password
    REDIS_TLS_ENABLED       = "false"
    METADATA_HOST_URL       = var.metadata_url
    STARION_SYNC_BASE_URL   = local.configurator_url
    WEBHOOK_PUBLIC_KEY      = var.webhook_public_key
    STARION_SYNC_API_KEY    = random_shuffle.configurator_api_key.result[0]
    MICROSOFT_CLIENT_ID     = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET = var.microsoft_client_secret
    GOOGLE_CLIENT_ID        = var.google_client_id
    GOOGLE_CLIENT_SECRET    = var.google_client_secret
  }

  depends_on = [
    null_resource.formsync_builder,
    fly_machine.redis,
    fly_machine.mongodb,
  ]
}
