
module "flyio" {
  source = "./flyio"
  providers = {
    fly = fly
  }

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
