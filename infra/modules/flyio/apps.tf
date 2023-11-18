locals {
  db_uri            = !var.is_production ? "mongodb://${var.mongodb_user}:${var.mongodb_password}@${local.mongodb_app_name}.fly.dev:27017/starion-sync?directConnection=true&replicaSet=rs0&authSource=admin" : var.db_uri
  metadata_db_uri   = !var.is_production ? "mongodb://${var.mongodb_user}:${var.mongodb_password}@${local.mongodb_app_name}.fly.dev:27017/starion-form-sync?directConnection=true&replicaSet=rs0&authSource=admin" : var.db_uri
  dest_db_uri       = var.is_production ? var.dest_db_uri : var.dest_db_uri
  formsync_db_uri   = var.is_production ? var.dest_db_uri : var.dest_db_uri
  redis_host        = !var.is_production ? "${local.redis_app_name}.fly.dev" : var.redis_host
  redis_port        = !var.is_production ? "6379" : var.redis_port
  redis_password    = !var.is_production ? var.redis_password : var.redis_password
  redis_tls_enabled = !var.is_production ? "false" : "true"
  # downloader_url           = "https://${fly_app.downloader.name}.fly.dev"
  # comparer_url             = "https://${fly_app.comparer.name}.fly.dev"
  # loader_url               = "https://${fly_app.loader.name}.fly.dev"
  # metadata_url             = "https://${fly_app.metadata.name}.fly.dev"
  configurator_url         = var.is_production ? "https://${local.configurator_app_name}.fly.dev" : "https://${local.apps_app_name}.fly.dev"
  webhook_trigger_base_url = "https://${local.webhook_trigger_app_name}.fly.dev"
}

resource "random_shuffle" "processor_api_key" {
  input        = var.processor_api_keys
  result_count = 1
}

resource "random_shuffle" "configurator_api_key" {
  input        = var.api_keys
  result_count = 1
}

// ******************************* APPS (configurator, controller, worker, cron trigger, post-processor, webhook) New *******************************
locals {
  apps_dockerfile_path = abspath("${path.module}/build/apps/Dockerfile")
  apps_files = sort(setunion(
    [
      local.apps_dockerfile_path,
      abspath("${path.module}/build/apps/fly.toml")
    ],
    [for f in fileset("${local.configurator_path}", "**") : "${local.configurator_path}/${f}"],
    [for f in fileset("${local.controller_path}", "**") : "${local.controller_path}/${f}"],
    [for f in fileset("${local.worker_path}", "**") : "${local.worker_path}/${f}"],
    [for f in fileset("${local.post_processor_path}", "**") : "${local.post_processor_path}/${f}"],
    [for f in fileset("${local.webhook_path}", "**") : "${local.webhook_path}/${f}"],
    [for f in fileset("${local.cron_trigger_path}", "**") : "${local.cron_trigger_path}/${f}"],
  ))
  apps_hash      = md5(join("", [for i in local.apps_files : filemd5(i)]))
  apps_image_url = "registry.fly.io/${local.apps_app_name}:${local.apps_hash}"
  apps_env = {
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
    REDIS_HOST              = local.redis_host
    REDIS_PORT              = local.redis_port
    REDIS_PASSWORD          = local.redis_password
    REDIS_TLS_ENABLED       = local.redis_tls_enabled
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
    TRIGGER_RESTART         = "false"
  }
}
resource "null_resource" "fly_app_apps" {
  count = local.apps_count
  triggers = {
    name = local.apps_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.apps_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv4_apps" {
  count = local.apps_count
  triggers = {
    app = local.apps_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v4 -a ${local.apps_app_name} -y -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_apps
  ]
}
resource "null_resource" "fly_ipv6_apps" {
  count = local.apps_count
  triggers = {
    app = local.apps_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.apps_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_apps
  ]
}

resource "null_resource" "apps_builder" {
  count = local.apps_count
  triggers = {
    hash = local.apps_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = local.apps_dockerfile_path
      DOCKER_IMAGE_NAME   = local.apps_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

resource "null_resource" "fly_machine_apps" {
  count = local.apps_count
  triggers = {
    hash   = local.apps_hash
    region = var.region
    env    = jsonencode(local.apps_env)
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
        -y -t $FLY_API_TOKEN \
        -a ${local.apps_app_name} \
        -r ${self.triggers.region} \
        -i "${local.apps_image_url}" \
        ${join(" ", [for key, value in local.apps_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/apps")
  }

  depends_on = [
    null_resource.fly_app_apps,
    null_resource.apps_builder
  ]
}

// **************************** Webhook Trigger New ****************************
locals {
  webhook_trigger_path            = abspath("${path.root}/../apps/triggers/webhook")
  webhook_trigger_dockerfile_path = abspath("${local.webhook_trigger_path}/Dockerfile")
  webhook_trigger_files = sort(setunion(
    [
      local.webhook_trigger_dockerfile_path,
      abspath("${path.module}/build/webhook-trigger/fly.toml")
    ],
    [for f in fileset("${local.webhook_trigger_path}", "**") : "${local.webhook_trigger_path}/${f}"],
  ))
  webhook_trigger_hash      = md5(join("", [for i in local.webhook_trigger_files : filemd5(i)]))
  webhook_trigger_image_url = "registry.fly.io/${local.webhook_trigger_app_name}:${local.webhook_trigger_hash}"
  webhook_trigger_env = {
    NODE_ENV                 = var.environment
    LOG_LEVEL                = var.is_production ? "info" : "debug"
    PORT                     = "8080"
    DB_TYPE                  = "mongodb"
    DB_URI                   = local.db_uri
    DEST_DB_URI              = local.dest_db_uri
    BROKER_TYPE              = "kafka"
    BROKER_URIS              = var.broker_uris
    KAFKA_CLIENT_ID          = "webhook-trigger"
    KAFKA_CONSUMER_GROUP_ID  = "webhook-trigger-consumer"
    KAFKA_SSL_ENABLED        = "true"
    KAFKA_SASL_ENABLED       = "true"
    KAFKA_SASL_USERNAME      = var.kafka_sasl_username
    KAFKA_SASL_PASSWORD      = var.kafka_sasl_password
    REDIS_HOST               = local.redis_host
    REDIS_PORT               = local.redis_port
    REDIS_PASSWORD           = local.redis_password
    REDIS_TLS_ENABLED        = local.redis_tls_enabled
    GOOGLE_CLIENT_ID         = var.google_client_id
    GOOGLE_CLIENT_SECRET     = var.google_client_secret
    WEBHOOK_TRIGGER_BASE_URL = local.webhook_trigger_base_url
    TRIGGER_REBUILD          = "true"
  }
}
resource "null_resource" "fly_app_webhook_trigger" {
  count = local.webhook_trigger_count
  triggers = {
    name = local.webhook_trigger_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.webhook_trigger_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv4_webhook_trigger" {
  count = local.webhook_trigger_count
  triggers = {
    app = local.webhook_trigger_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v4 -a ${local.webhook_trigger_app_name} -y -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_webhook_trigger
  ]
}
resource "null_resource" "fly_ipv6_webhook_trigger" {
  count = local.webhook_trigger_count
  triggers = {
    app = local.webhook_trigger_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.webhook_trigger_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_webhook_trigger
  ]
}

resource "null_resource" "webhook_trigger_builder" {
  count = local.webhook_trigger_count
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
      DOCKER_FILE         = local.webhook_trigger_dockerfile_path
      DOCKER_IMAGE_NAME   = local.webhook_trigger_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

resource "null_resource" "fly_machine_webhook_trigger" {
  count = local.webhook_trigger_count
  triggers = {
    hash   = local.webhook_trigger_hash
    region = var.region
    env    = jsonencode(local.webhook_trigger_env)
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
      -y -t $FLY_API_TOKEN \
      -a ${local.webhook_trigger_app_name} \
      -r ${self.triggers.region} \
      -i "${local.webhook_trigger_image_url}" \
      ${join(" ", [for key, value in local.webhook_trigger_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/webhook-trigger")
  }

  depends_on = [
    null_resource.fly_app_webhook_trigger,
    null_resource.webhook_trigger_builder
  ]
}

// **************************** Formsync New ****************************

locals {
  formsync_path            = abspath("${path.root}/../form-sync/main")
  formsync_dockerfile_path = abspath("${local.formsync_path}/Dockerfile")
  formsync_files = sort(setunion(
    [
      local.formsync_dockerfile_path,
      abspath("${path.module}/build/formsync/fly.toml")
    ],
    [for f in fileset("${local.formsync_path}", "**") : "${local.formsync_path}/${f}"],
  ))
  formsync_hash      = md5(join("", [for i in local.formsync_files : filemd5(i)]))
  formsync_image_url = "registry.fly.io/${local.formsync_app_name}:${local.formsync_hash}"
  formsync_env = {
    NODE_ENV                = var.environment
    PORT                    = "8080"
    LOG_LEVEL               = var.is_production ? "debug" : "debug"
    API_KEYS                = join(",", var.api_keys)
    DB_URI                  = local.formsync_db_uri
    DB_TLS_ENABLED          = "true"
    DB_NAME                 = "starion-form-sync"
    METADATA_DB_URI         = local.metadata_db_uri
    REDIS_HOST              = local.redis_host
    REDIS_PORT              = local.redis_port
    REDIS_PASSWORD          = local.redis_password
    REDIS_TLS_ENABLED       = local.redis_tls_enabled
    METADATA_HOST_URL       = var.metadata_url
    STARION_SYNC_BASE_URL   = local.configurator_url
    WEBHOOK_PUBLIC_KEY      = var.webhook_public_key
    STARION_SYNC_API_KEY    = random_shuffle.configurator_api_key.result[0]
    MICROSOFT_CLIENT_ID     = var.microsoft_client_id
    MICROSOFT_CLIENT_SECRET = var.microsoft_client_secret
    GOOGLE_CLIENT_ID        = var.google_client_id
    GOOGLE_CLIENT_SECRET    = var.google_client_secret
    TRIGGER_REDEPLOY        = "true"
  }
}
resource "null_resource" "fly_app_formsync" {
  count = local.formsync_count
  triggers = {
    name = local.formsync_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.formsync_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv4_formsync" {
  count = local.formsync_count
  triggers = {
    app = local.formsync_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v4 -a ${local.formsync_app_name} -y -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_formsync
  ]
}
resource "null_resource" "fly_ipv6_formsync" {
  count = local.formsync_count
  triggers = {
    app = local.formsync_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.formsync_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_formsync
  ]
}

resource "null_resource" "formsync_builder" {
  count = local.formsync_count
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
      DOCKER_FILE         = local.formsync_dockerfile_path
      DOCKER_IMAGE_NAME   = local.formsync_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
    }
    working_dir = local.formsync_path
  }
}

resource "null_resource" "fly_machine_formsync" {
  count = local.formsync_count
  triggers = {
    hash   = local.formsync_hash
    region = var.region
    env    = jsonencode(local.formsync_env)
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
        -y -t $FLY_API_TOKEN \
        -a ${local.formsync_app_name} \
        -r ${self.triggers.region} \
        -i "${local.formsync_image_url}" \
        ${join(" ", [for key, value in local.formsync_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/formsync")
  }

  depends_on = [
    null_resource.fly_app_formsync,
    null_resource.formsync_builder
  ]
}

// **************************** Cron Trigger ****************************

resource "fly_app" "cron_trigger" {
  count = local.cron_trigger_count

  name = "${var.project}-${var.environment}-cron-trigger"
  org  = var.organization
}

locals {
  cron_trigger_path = abspath("${path.root}/../apps/triggers/cron")
  cron_trigger_files = sort(setunion(
    [
      "${local.cron_trigger_path}/Dockerfile",
    ],
    [for f in fileset("${local.cron_trigger_path}", "**") : "${local.cron_trigger_path}/${f}"],
  ))
  cron_trigger_hash = md5(join("", [for i in local.cron_trigger_files : filemd5(i)]))
}

resource "null_resource" "cron_trigger_builder" {
  count = local.cron_trigger_count

  triggers = {
    hash = local.cron_trigger_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.cron_trigger_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.cron_trigger[0].name
      DOCKER_IMAGE_DIGEST = local.cron_trigger_hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

// resource "fly_machine" "cron_trigger" {
// count = local.cron_trigger_count

// app    = fly_app.cron_trigger[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-cron-trigger"

// cputype  = "shared"
// cpus     = 1
// memorymb = 256

// image = "registry.fly.io/${fly_app.cron_trigger[0].name}:${local.cron_trigger_hash}"

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port : 443,
// handlers : [
// "tls",
// "http"
// ]
// },
// {
// "port" : 80,
// "handlers" : [
// "http"
// ]
// }
// ],
// "internal_port" : 8080,
// }
// ]

// env = {
// NODE_ENV                = var.environment
// LOG_LEVEL               = var.is_production ? "info" : "debug"
// DB_TYPE                 = "mongodb"
// DB_URI                  = local.db_uri
// DEST_DB_URI             = local.dest_db_uri
// BROKER_TYPE             = "kafka"
// BROKER_URIS             = var.broker_uris
// KAFKA_CLIENT_ID         = "cron-trigger"
// KAFKA_CONSUMER_GROUP_ID = "cron-trigger-consumer"
// KAFKA_SSL_ENABLED       = "true"
// KAFKA_SASL_ENABLED      = "true"
// KAFKA_SASL_USERNAME     = var.kafka_sasl_username
// KAFKA_SASL_PASSWORD     = var.kafka_sasl_password
// REDIS_HOST              = local.redis_host
// REDIS_PORT              = local.redis_port
// REDIS_PASSWORD          = local.redis_password
// REDIS_TLS_ENABLED       = local.redis_tls_enabled
// }

// depends_on = [
// null_resource.cron_trigger_builder,
// fly_machine.redis,
// fly_machine.mongodb,
// ]
// }

// **************************** Configurator ****************************

resource "fly_app" "configurator" {
  count = local.configurator_count

  name = "${var.project}-${var.environment}-configurator"
  org  = var.organization
}

locals {
  configurator_path = abspath("${path.root}/../apps/configurator")
  configurator_files = sort(setunion(
    [
      "${local.configurator_path}/Dockerfile",
    ],
    [for f in fileset("${local.configurator_path}", "**") : "${local.configurator_path}/${f}"],
  ))
  configurator_hash = md5(join("", [for i in local.configurator_files : filemd5(i)]))
}

resource "null_resource" "configurator_builder" {
  count = local.configurator_count

  triggers = {
    hash = local.configurator_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.configurator_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.configurator[0].name
      DOCKER_IMAGE_DIGEST = local.configurator_hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

resource "fly_ip" "configurator_ip_v4" {
  count = local.configurator_count

  app  = fly_app.configurator[0].name
  type = "v4"
}

resource "fly_ip" "configurator_ip_v6" {
  count = local.configurator_count

  app  = fly_app.configurator[0].name
  type = "v6"
}

// resource "fly_machine" "configurator" {
// count = local.configurator_count

// app    = fly_app.configurator[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-configurator"

// cputype  = "shared"
// cpus     = 1
// memorymb = 512

// image = "registry.fly.io/${fly_app.configurator[0].name}:${local.configurator_hash}"

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port : 443,
// handlers : [
// "tls",
// "http"
// ]
// },
// {
// "port" : 80,
// "handlers" : [
// "http"
// ]
// }
// ],
// "internal_port" : 8080,
// }
// ]

// env = {
// NODE_ENV                       = var.environment
// PORT                           = "8080"
// LOG_LEVEL                      = var.is_production ? "info" : "debug"
// BROKER_URIS                    = var.broker_uris
// DB_TYPE                        = "mongodb"
// DB_URI                         = local.db_uri
// DEST_DB_URI                    = local.dest_db_uri
// BROKER_TYPE                    = "kafka"
// KAFKA_CLIENT_ID                = "configurator"
// KAFKA_CONSUMER_GROUP_ID        = "configurator-consumer"
// KAFKA_SSL_ENABLED              = "true"
// KAFKA_SASL_ENABLED             = "true"
// KAFKA_SASL_USERNAME            = var.kafka_sasl_username
// KAFKA_SASL_PASSWORD            = var.kafka_sasl_password
// REDIS_HOST                     = local.redis_host
// REDIS_PORT                     = local.redis_port
// REDIS_PASSWORD                 = local.redis_password
// REDIS_TLS_ENABLED              = local.redis_tls_enabled
// ORCHESTRATOR_ADDRESS           = var.orchestrator_address
// ORCHESTRATOR_WORKER_TASKQUEUE  = "configurator"
// ORCHESTRATOR_DEFAULT_TASKQUEUE = "configurator"
// API_KEYS                       = join(",", var.api_keys)
// MICROSOFT_CLIENT_ID            = var.microsoft_client_id
// MICROSOFT_CLIENT_SECRET        = var.microsoft_client_secret
// GOOGLE_CLIENT_ID               = var.google_client_id
// GOOGLE_CLIENT_SECRET           = var.google_client_secret
// TRIGGER_RESTART                = "true"
// }

// depends_on = [
// null_resource.configurator_builder,
// fly_machine.mongodb,
// ]
// }

// **************************** Controller ****************************

resource "fly_app" "controller" {
  count = local.controller_count

  name = "${var.project}-${var.environment}-controller"
  org  = var.organization
}

locals {
  controller_path = abspath("${path.root}/../apps/controller")
  controller_files = sort(setunion(
    [
      "${local.controller_path}/Dockerfile",
    ],
    [for f in fileset("${local.controller_path}", "**") : "${local.controller_path}/${f}"],
  ))
  controller_hash = md5(join("", [for i in local.controller_files : filemd5(i)]))
}

resource "null_resource" "controller_builder" {
  count = local.controller_count

  triggers = {
    hash = local.controller_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.controller_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.controller[0].name
      DOCKER_IMAGE_DIGEST = local.controller_hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

// resource "fly_machine" "controller" {
// count = local.controller_count

// app    = fly_app.controller[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-controller"

// cputype  = "shared"
// cpus     = 1
// memorymb = 1024

// image = "registry.fly.io/${fly_app.controller[0].name}:${local.controller_hash}"

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port : 443,
// handlers : [
// "tls",
// "http"
// ]
// },
// {
// "port" : 80,
// "handlers" : [
// "http"
// ]
// }
// ],
// "internal_port" : 8080,
// }
// ]

// env = {
// NODE_ENV                       = var.environment
// LOG_LEVEL                      = var.is_production ? "info" : "debug"
// BROKER_URIS                    = var.broker_uris
// DB_TYPE                        = "mongodb"
// DB_URI                         = local.db_uri
// BROKER_TYPE                    = "kafka"
// KAFKA_CLIENT_ID                = "controller"
// KAFKA_CONSUMER_GROUP_ID        = "controller-consumer"
// KAFKA_SSL_ENABLED              = "true"
// KAFKA_SASL_ENABLED             = "true"
// KAFKA_SASL_USERNAME            = var.kafka_sasl_username
// KAFKA_SASL_PASSWORD            = var.kafka_sasl_password
// ORCHESTRATOR_ADDRESS           = var.orchestrator_address
// ORCHESTRATOR_WORKER_TASKQUEUE  = "controller"
// ORCHESTRATOR_DEFAULT_TASKQUEUE = "controller"
// MICROSOFT_CLIENT_ID            = var.microsoft_client_id
// MICROSOFT_CLIENT_SECRET        = var.microsoft_client_secret
// GOOGLE_CLIENT_ID               = var.google_client_id
// GOOGLE_CLIENT_SECRET           = var.google_client_secret
// TRIGGER_RESTART                = "true"
// }

// depends_on = [
// null_resource.controller_builder,
// fly_machine.mongodb,
// ]
// }

// **************************** Worker ****************************

resource "fly_app" "worker" {
  count = local.worker_count

  name = "${var.project}-${var.environment}-worker"
  org  = var.organization
}

locals {
  worker_path = abspath("${path.root}/../apps/worker")
  worker_files = sort(setunion(
    [
      "${local.worker_path}/Dockerfile",
    ],
    [for f in fileset("${local.worker_path}", "**") : "${local.worker_path}/${f}"],
  ))
  worker_hash = md5(join("", [for i in local.worker_files : filemd5(i)]))
}

resource "null_resource" "worker_builder" {
  count = local.worker_count

  triggers = {
    hash = local.worker_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.worker_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.worker[0].name
      DOCKER_IMAGE_DIGEST = local.worker_hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

// resource "fly_machine" "worker" {
// count = local.worker_count

// app    = fly_app.worker[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-worker"

// cputype  = "shared"
// cpus     = 1
// memorymb = 1024

// image = "registry.fly.io/${fly_app.worker[0].name}:${local.worker_hash}"

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port : 443,
// handlers : [
// "tls",
// "http"
// ]
// },
// {
// "port" : 80,
// "handlers" : [
// "http"
// ]
// }
// ],
// "internal_port" : 8080,
// }
// ]

// env = {
// NODE_ENV                       = var.environment
// LOG_LEVEL                      = var.is_production ? "info" : "debug"
// BROKER_URIS                    = var.broker_uris
// DB_TYPE                        = "mongodb"
// DB_URI                         = local.db_uri
// BROKER_TYPE                    = "kafka"
// KAFKA_CLIENT_ID                = "worker"
// KAFKA_CONSUMER_GROUP_ID        = "worker-consumer"
// KAFKA_SSL_ENABLED              = "true"
// KAFKA_SASL_ENABLED             = "true"
// KAFKA_SASL_USERNAME            = var.kafka_sasl_username
// KAFKA_SASL_PASSWORD            = var.kafka_sasl_password
// ORCHESTRATOR_ADDRESS           = var.orchestrator_address
// ORCHESTRATOR_WORKER_TASKQUEUE  = "worker"
// ORCHESTRATOR_DEFAULT_TASKQUEUE = "worker"
// DOWNLOADER_URL                 = var.downloader_url
// COMPARER_URL                   = var.comparer_url
// LOADER_URL                     = var.loader_url
// PROCESSOR_API_KEY              = random_shuffle.processor_api_key.result[0]
// MICROSOFT_CLIENT_ID            = var.microsoft_client_id
// MICROSOFT_CLIENT_SECRET        = var.microsoft_client_secret
// GOOGLE_CLIENT_ID               = var.google_client_id
// GOOGLE_CLIENT_SECRET           = var.google_client_secret
// TRIGGER_RESTART                = "true"
// }

// depends_on = [
// null_resource.worker_builder,
// fly_machine.mongodb,
// ]
// }

// **************************** Post Processor ****************************

resource "fly_app" "post_processor" {
  count = local.post_processor_count

  name = "${var.project}-${var.environment}-post-processor"
  org  = var.organization
}

locals {
  post_processor_path = abspath("${path.root}/../apps/post-processor")
  post_processor_files = sort(setunion(
    [
      "${local.post_processor_path}/Dockerfile",
    ],
    [for f in fileset("${local.post_processor_path}", "**") : "${local.post_processor_path}/${f}"],
  ))
  post_processor_hash = md5(join("", [for i in local.post_processor_files : filemd5(i)]))
}

resource "null_resource" "post_processor_builder" {
  count = local.post_processor_count

  triggers = {
    hash = local.post_processor_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.post_processor_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.post_processor[0].name
      DOCKER_IMAGE_DIGEST = local.post_processor_hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

// resource "fly_machine" "post-processor" {
// count = local.post_processor_count

// app    = fly_app.post_processor[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-post-processor"

// cputype  = "shared"
// cpus     = 1
// memorymb = 256

// image = "registry.fly.io/${fly_app.post_processor[0].name}:${local.post_processor_hash}"

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port : 443,
// handlers : [
// "tls",
// "http"
// ]
// },
// {
// "port" : 80,
// "handlers" : [
// "http"
// ]
// }
// ],
// "internal_port" : 8080,
// }
// ]

// env = {
// NODE_ENV                              = var.environment
// LOG_LEVEL                             = var.is_production ? "info" : "debug"
// BROKER_URIS                           = var.broker_uris
// DB_TYPE                               = "mongodb"
// DB_URI                                = local.db_uri
// BROKER_TYPE                           = "kafka"
// KAFKA_CLIENT_ID                       = "post-processor"
// KAFKA_CONSUMER_GROUP_ID               = "post-processor-consumer"
// KAFKA_SSL_ENABLED                     = "true"
// KAFKA_SASL_ENABLED                    = "true"
// KAFKA_SASL_USERNAME                   = var.kafka_sasl_username
// KAFKA_SASL_PASSWORD                   = var.kafka_sasl_password
// ORCHESTRATOR_ADDRESS                  = var.orchestrator_address
// ORCHESTRATOR_post-processor_TASKQUEUE = "post-processor"
// ORCHESTRATOR_DEFAULT_TASKQUEUE        = "post-processor"
// S3_URL                                = var.s3_endpoint
// S3_REGION                             = var.s3_region
// S3_DIFF_DATA_BUCKET                   = var.s3_bucket
// S3_ACCESS_KEY                         = var.s3_access_key
// S3_SECRET_KEY                         = var.s3_secret_key
// TRIGGER_RESTART                       = "true"
// }

// depends_on = [
// null_resource.post_processor_builder,
// fly_machine.mongodb,
// ]
// }

// **************************** Webhook ****************************

resource "fly_app" "webhook" {
  count = local.webhook_count

  name = "${var.project}-${var.environment}-webhook"
  org  = var.organization
}

locals {
  webhook_path = abspath("${path.root}/../apps/webhook")
  webhook_files = sort(setunion(
    [
      "${local.webhook_path}/Dockerfile",
    ],
    [for f in fileset("${local.webhook_path}", "**") : "${local.webhook_path}/${f}"],
  ))
  webhook_hash = md5(join("", [for i in local.webhook_files : filemd5(i)]))
}

resource "null_resource" "webhook_builder" {
  count = local.webhook_count

  triggers = {
    hash = local.webhook_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = abspath("${local.webhook_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.webhook[0].name
      DOCKER_IMAGE_DIGEST = local.webhook_hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

// resource "fly_machine" "webhook" {
// count = local.webhook_count

// app    = fly_app.webhook[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-webhook"

// cputype  = "shared"
// cpus     = 1
// memorymb = 256

// image = "registry.fly.io/${fly_app.webhook[0].name}:${local.webhook_hash}"

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port : 443,
// handlers : [
// "tls",
// "http"
// ]
// },
// {
// "port" : 80,
// "handlers" : [
// "http"
// ]
// }
// ],
// "internal_port" : 8080,
// }
// ]

// env = {
// NODE_ENV                = var.environment
// LOG_LEVEL               = var.is_production ? "info" : "debug"
// BROKER_URIS             = var.broker_uris
// DB_TYPE                 = "mongodb"
// DB_URI                  = local.db_uri
// BROKER_TYPE             = "kafka"
// KAFKA_CLIENT_ID         = "webhook"
// KAFKA_CONSUMER_GROUP_ID = "webhook-consumer"
// KAFKA_SSL_ENABLED       = "true"
// KAFKA_SASL_ENABLED      = "true"
// KAFKA_SASL_USERNAME     = var.kafka_sasl_username
// KAFKA_SASL_PASSWORD     = var.kafka_sasl_password
// REDIS_HOST              = local.redis_host
// REDIS_PORT              = local.redis_port
// REDIS_PASSWORD          = local.redis_password
// REDIS_TLS_ENABLED       = local.redis_tls_enabled
// WEBHOOK_PRIVATE_KEY     = var.webhook_private_key
// }

// depends_on = [
// null_resource.webhook_builder,
// fly_machine.redis,
// fly_machine.mongodb,
// ]
// }

// **************************** Test App ****************************
locals {
  test_app_path            = abspath("${path.root}/../apps/test")
  test_app_dockerfile_path = abspath("${local.test_app_path}/Dockerfile")
  test_app_files = sort(setunion(
    [
      local.test_app_dockerfile_path,
      abspath("${path.module}/build/test-app/fly.toml")
    ],
    [for f in fileset("${local.test_app_path}", "**") : "${local.test_app_path}/${f}"],
  ))
  test_app_hash      = md5(join("", [for i in local.test_app_files : filemd5(i)]))
  test_app_image_url = "registry.fly.io/${local.test_app_name}:${local.test_app_hash}"
  test_app_env = {
    TRIGGER_REBUILD = "true"
  }
}
resource "null_resource" "fly_app_test_app" {
  count = local.test_app_count
  triggers = {
    name = local.test_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.test_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv6_test_app" {
  count = local.test_app_count
  triggers = {
    app = local.test_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.test_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_test_app
  ]
}

resource "null_resource" "test_app_builder" {
  count = local.test_app_count
  triggers = {
    hash = local.test_app_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = local.test_app_dockerfile_path
      DOCKER_IMAGE_NAME   = local.test_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }
}

resource "null_resource" "fly_machine_test_app" {
  count = local.test_app_count
  triggers = {
    hash   = local.test_app_hash
    region = var.region
    env    = jsonencode(local.test_app_env)
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
        -y -t $FLY_API_TOKEN \
        -a ${local.test_app_name} \
        -r ${self.triggers.region} \
        -i "${local.test_app_image_url}" \
        ${join(" ", [for key, value in local.test_app_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/test-app")
  }

  depends_on = [
    null_resource.fly_app_test_app,
    null_resource.test_app_builder
  ]
}
