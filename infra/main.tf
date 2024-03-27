
locals {
  is_production            = var.environment == "production" ? true : false
  db_uri_stagging     = "mongodb://root${var.mongodb_user}:rootpassword${var.mongodb_password}@mongodb-replicaset-0.mongodb-replicaset-headless.default.svc.cluster.local:27017/starion-sync?directConnection=true&authSource=admin"      # stagging
  metadata_db_uri_stagging = "mongodb://root${var.mongodb_user}:rootpassword${var.mongodb_password}@mongodb-replicaset-0.mongodb-replicaset-headless.default.svc.cluster.local:27017/starion-form-sync?directConnection=true&authSource=admin" # stagging
  broker_uri               = "${module.upstash.kafka_uri}:9092"
  redis_host        = !local.is_production ? "redisdb-headless.default.svc.cluster.local" : var.redis_host
  redis_port        = !local.is_production ? "6379" : var.redis_port
  redis_password    = !local.is_production ? var.redis_password : var.redis_password
  redis_tls_enabled = !local.is_production ? "false" : "true"
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

  metadata_db_uri    = local.is_production ? var.metadata_db_uri : local.metadata_db_uri_stagging
  dest_db_uri        = local.is_production ? var.dest_db_uri : var.dest_db_uri
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

module "k8s" {
  source = "./modules/k8s"

  project       = var.project
  environment   = var.environment
  is_production = local.is_production

  github_repo_name              = var.github_repo_name
  github_repo_url               = var.github_repo_url
  github_owner                  = var.github_owner
  github_branch                 = var.github_branch
  
  k8s_namespace = var.k8s_namespace

  GOOGLE_CREDENTIALS            = var.GOOGLE_CREDENTIALS
  gcp_project                   = var.gcp_project
  gcp_region                    = var.gcp_region
  gcp_secret_prefix             = var.gcp_secret_prefix
  gcp_deploy_service_account_id = var.gcp_deploy_service_account_id
  gcp_docker_repository_name    = var.gcp_docker_repository_name
  google_client_id              = var.google_client_id

  db_uri                        = local.is_production ? var.db_uri : local.db_uri_stagging
  dest_db_uri     =  var.dest_db_uri
  dest_db_schema = var.dest_db_schema
  metadata_db_uri = local.is_production ? var.metadata_db_uri : local.metadata_db_uri_stagging
  formsync_db_uri = var.formsync_db_uri
  formsync_db_schema = var.formsync_db_schema

  redis_host                    = local.redis_host
  redis_port                    = local.redis_port
  redis_password                = local.redis_password
  redis_db = var.redis_db
  redis_tls_enabled = local.redis_tls_enabled

  kafka_sasl_username = module.upstash.kafka_username
  kafka_sasl_password = module.upstash.kafka_password

  broker_uris                   = local.broker_uri

  orchestrator_address          = var.orchestrator_address
  orchestrator_client_cert      = var.orchestrator_client_cert
  orchestrator_client_key       = var.orchestrator_client_key
  orchestrator_namespace        = var.orchestrator_namespace
  orchestrator_tls_enabled      = var.orchestrator_tls_enabled

  s3_endpoint     = module.cloudflare.s3_endpoint
  s3_region       = var.s3_region
  s3_bucket       = module.cloudflare.s3_bucket_name
  s3_access_key   = var.s3_access_key
  s3_secret_key   = var.s3_secret_key

  webhook_public_key            = var.webhook_public_key
  webhook_private_key           = var.webhook_private_key
  microsoft_client_id           = var.microsoft_client_id
  microsoft_client_secret       = var.microsoft_client_secret
  google_client_secret          = var.google_client_secret
  api_keys                      = split(",", var.api_keys)
  processor_api_keys            = split(",", var.processor_api_keys)

  loader_url                    = var.loader_url
  comparer_url                  = var.comparer_url
  downloader_url                = var.downloader_url
  metadata_url                  = var.metadata_url

  configurator_public_url = var.configurator_public_url
  webhook_trigger_public_url = var.webhook_trigger_public_url

  #k8s config
  k8s_deployment_downloader      = var.k8s_deployment_downloader
  k8s_deployment_comparer        = var.k8s_deployment_comparer
  k8s_deployment_loader          = var.k8s_deployment_loader
  k8s_deployment_metadata        = var.k8s_deployment_metadata
  k8s_deployment_configurator    = var.k8s_deployment_configurator
  k8s_deployment_webhook_trigger = var.k8s_deployment_webhook_trigger
  k8s_deployment_formsync        = var.k8s_deployment_formsync
  k8s_deployment_cron_trigger    = var.k8s_deployment_cron_trigger
  k8s_deployment_controller      = var.k8s_deployment_controller
  k8s_deployment_worker          = var.k8s_deployment_worker
  k8s_deployment_post_processor  = var.k8s_deployment_post_processor
  k8s_deployment_webhook         = var.k8s_deployment_webhook

  #domain
  letsencrypt_cluster_issuer_name = var.letsencrypt_cluster_issuer_name
  letsencrypt_email               = var.letsencrypt_email
  configurator_domain             = var.configurator_domain
  webhook_trigger_domain          = var.webhook_trigger_domain
  formsync_domain                 = var.formsync_domain
  replicas_count                  = var.replicas_count

  #db (local)
  mongodb_user      = var.mongodb_user
  mongodb_password  = var.mongodb_password
  postgres_user     = var.postgres_user
  postgres_password = var.postgres_password

  depends_on = [
    module.cloudflare,
    module.digitalocean
  ]
}
