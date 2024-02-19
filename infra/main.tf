
locals {
  postgres_stagging_uri    = local.is_production ? null : "postgres://${var.postgres_user}:${var.postgres_password}@starion-sync-stagging-postgres.fly.dev:5432/starion-sync?sslmode=disable"                          # stagging
  mongodb_stagging_uri     = local.is_production ? null : "mongodb://${var.mongodb_user}:${var.mongodb_password}@starion-sync-stagging-mongodb.fly.dev:27017/starion-sync?directConnection=true&authSource=admin"      # stagging
  metadata_db_stagging_uri = local.is_production ? null : "mongodb://${var.mongodb_user}:${var.mongodb_password}@starion-sync-stagging-mongodb.fly.dev:27017/starion-form-sync?directConnection=true&authSource=admin" # stagging
  broker_uri               = "${module.upstash.kafka_uri}:9092"
  is_production            = var.environment == "production" ? true : false
}

module "digitalocean" {
  source = "./modules/digitalocean"

  project       = var.project
  environment   = var.environment
  is_production = local.is_production

  do_token  = var.do_token
  do_region = var.do_region

  providers = {
    digitalocean = digitalocean
  }
}

module "flyio" {
  source = "./modules/flyio"
  providers = {
    fly = fly
  }

  project       = var.project
  environment   = var.environment
  is_production = local.is_production

  region                   = var.fly_region
  fly_api_token            = var.fly_api_token
  mongodb_user             = var.mongodb_user
  mongodb_password         = var.mongodb_password
  postgres_user            = var.postgres_user
  postgres_password        = var.postgres_password
  redis_host               = module.digitalocean.redis_host
  redis_port               = module.digitalocean.redis_port
  redis_password           = local.is_production ? module.digitalocean.redis_password : var.redis_password
  db_uri                   = local.is_production ? module.digitalocean.mongodb_uri : local.postgres_stagging_uri
  dest_db_uri              = local.is_production ? replace(module.digitalocean.postgres_uri, "sslmode=require", "") : var.dest_db_uri # stagging (temporary) & production
  orchestrator_address     = var.orchestrator_address
  orchestrator_namespace   = var.orchestrator_namespace
  orchestrator_tls_enabled = var.orchestrator_tls_enabled
  orchestrator_client_cert = var.orchestrator_client_cert
  orchestrator_client_key  = var.orchestrator_client_key
  broker_uris              = local.broker_uri
  kafka_sasl_username      = module.upstash.kafka_username
  kafka_sasl_password      = module.upstash.kafka_password
  s3_endpoint              = module.cloudflare.s3_endpoint
  s3_region                = var.s3_region
  s3_bucket          = module.cloudflare.s3_bucket_name
  s3_access_key            = var.s3_access_key
  s3_secret_key            = var.s3_secret_key
  downloader_url           = module.googlecloud.downloader_url
  comparer_url             = module.googlecloud.comparer_url
  loader_url               = module.googlecloud.loader_url
  metadata_url             = module.googlecloud.metadata_url
  api_keys                 = split(",", var.api_keys)
  processor_api_keys       = split(",", var.processor_api_keys)
  harmonies_api_keys       = split(",", var.harmonies_api_keys)
  webhook_public_key       = var.webhook_public_key
  webhook_private_key      = var.webhook_private_key
  microsoft_client_id      = var.microsoft_client_id
  microsoft_client_secret  = var.microsoft_client_secret
  google_client_id         = var.google_client_id
  google_client_secret     = var.google_client_secret


  depends_on = [
    module.digitalocean,
    module.cloudflare,
    module.googlecloud,
    module.upstash
  ]
}

module "googlecloud" {
  source = "./modules/googlecloud"

  project       = var.project
  environment   = var.environment
  is_production = local.is_production

  github_repo_name = var.github_repo_name
  github_repo_url  = var.github_repo_url
  github_owner     = var.github_owner
  github_branch    = var.github_branch

  gcp_project                   = var.gcp_project
  gcp_region                    = var.gcp_region
  gcp_secret_prefix             = var.gcp_secret_prefix
  gcp_deploy_service_account_id = var.gcp_deploy_service_account_id
  gcp_docker_repository_name    = var.gcp_docker_repository_name

  metadata_db_uri    = local.is_production ? module.digitalocean.mongodb_uri : local.metadata_db_stagging_uri
  dest_db_uri        = local.is_production ? module.digitalocean.postgres_uri : var.dest_db_uri
  s3_endpoint        = module.cloudflare.s3_endpoint
  s3_region          = var.s3_region
  s3_bucket          = module.cloudflare.s3_bucket_name
  s3_access_key      = var.s3_access_key
  s3_secret_key      = var.s3_secret_key
  processor_api_keys = split(",", var.processor_api_keys)

  depends_on = [
    module.cloudflare,
    module.digitalocean
  ]
}

module "cloudflare" {
  source = "./modules/cloudflare"

  project     = var.project
  environment = var.environment

  cf_zone_id    = var.cf_zone_id
  cf_account_id = var.cf_account_id
  cf_api_token  = var.cf_api_token
}

module "upstash" {
  source = "./modules/upstash"

  project       = var.project
  environment   = var.environment
  is_production = local.is_production

  upstash_email   = var.upstash_email
  upstash_api_key = var.upstash_api_key
  kafka_region    = var.upstash_kafka_region

  providers = {
    upstash = upstash
  }
}
