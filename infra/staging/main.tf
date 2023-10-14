
module "flyio" {
  source = "./flyio"
  providers = {
    fly = fly
  }

  project     = var.project
  environment = var.environment

  region               = var.fly_region
  fly_api_token        = var.fly_api_token
  redis_password       = var.redis_password
  mongodb_user         = var.mongodb_user
  mongodb_password     = var.mongodb_password
  postgres_user        = var.postgres_user
  postgres_password    = var.postgres_password
  orchestrator_address = var.orchestrator_address
  broker_uris          = var.broker_uris
  kafka_sasl_username  = var.kafka_sasl_username
  kafka_sasl_password  = var.kafka_sasl_password
  downloader_url       = module.googlecloud.downloader_url
  comparer_url         = module.googlecloud.comparer_url
  loader_url           = module.googlecloud.loader_url
  api_keys             = var.api_keys
  processor_api_keys   = var.processor_api_keys
  microsoft_client_id  = var.microsoft_client_id
  microsoft_secret_id  = var.microsoft_secret_id
  google_client_id     = var.google_client_id
  google_secret_id     = var.google_secret_id

  depends_on = [
    module.googlecloud
  ]
}

locals {
  postgres_uri = "postgres://${var.postgres_user}:${var.postgres_password}@starion-sync-stagging-postgres.fly.dev:5432/starion-sync?sslmode=disable"
  mongodb_uri  = "mongodb://${var.mongodb_user}:${var.mongodb_password}@starion-sync-stagging-mongodb.fly.dev:27017/starion-sync?directConnection=true&authSource=admin"
}

module "googlecloud" {
  source = "./googlecloud"

  project     = var.project
  environment = var.environment

  gcp_project        = var.gcp_project
  gcp_region         = var.gcp_region
  mongodb_uri        = local.mongodb_uri
  postgres_uri       = local.postgres_uri
  s3_endpoint        = var.s3_endpoint
  s3_region          = var.s3_region
  s3_bucket          = var.s3_bucket
  s3_access_key      = var.s3_access_key
  s3_secret_key      = var.s3_secret_key
  processor_api_keys = var.processor_api_keys

  # depends_on = [
  # module.flyio
  # ]
}

module "cloudflare" {
  source = "./cloudflare"

  project     = var.project
  environment = var.environment

  cf_zone_id    = var.cf_zone_id
  cf_account_id = var.cf_account_id
}
