
module "flyio" {
  source = "./flyio"
  providers = {
    fly = fly
  }

  project              = var.project
  environment          = var.environment
  region               = var.fly_region
  fly_api_token        = var.fly_api_token
  redis_password       = var.redis_password
  mongodb_user         = var.mongodb_user
  mongodb_password     = var.mongodb_password
  postgres_user        = var.postgres_user
  postgres_password    = var.postgres_password
  api_keys             = var.api_keys
  orchestrator_address = var.orchestrator_address
  broker_uris          = var.broker_uris
  kafka_sasl_username  = var.kafka_sasl_username
  kafka_sasl_password  = var.kafka_sasl_password
  microsoft_client_id  = var.microsoft_client_id
  microsoft_secret_id  = var.microsoft_secret_id
  google_client_id     = var.google_client_id
  google_secret_id     = var.google_secret_id
}

module "googlecloud" {
  source = "./googlecloud"

  project            = var.project
  environment        = var.environment
  gcp_project        = var.gcp_project
  gcp_region         = var.gcp_region
  mongodb_uri        = module.flyio.mongodb_uri
  postgres_uri       = module.flyio.postgres_uri
  processor_api_keys = var.processor_api_keys

  depends_on = [
    module.flyio
  ]
}
