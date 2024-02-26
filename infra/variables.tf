variable "project" {
  type    = string
  default = "starion-sync"
}

variable "environment" {
  type    = string
  default = "stagging"
}

variable "cluster_name" {
  type = string
}

variable "letsencrypt_cluster_issuer_name" {
  type = string
}

variable "github_owner" {
  type = string
}
variable "github_repo_name" {
  type = string
}
variable "github_repo_url" {
  type = string
}
variable "github_branch" {
  type = string
}


variable "fly_api_token" {
  type      = string
  sensitive = true
}
variable "fly_region" {
  type    = string
  default = "lax"
}

variable "gcp_project" {
  type    = string
  default = "starion-stagging"
}
variable "gcp_region" {
  type    = string
  default = "us-central1"
}
variable "gcp_secret_prefix" {
  type    = string
  default = "STARION_SYNC"
}
variable "gcp_deploy_service_account_id" {
  type = string
}
variable "gcp_docker_repository_name" {
  type    = string
  default = "starion-sync-images"
}

variable "cf_api_token" {
  type      = string
  sensitive = true
}
variable "cf_zone_id" {
  type = string
}
variable "cf_account_id" {
  type = string
}

variable "upstash_api_key" {
  type      = string
  sensitive = true
}
variable "upstash_email" {
  type = string
}

variable "do_token" {
  type      = string
  sensitive = true
}
variable "do_region" {
  type = string
}


variable "redis_password" { # stagging
  type      = string
  sensitive = true
  default   = null
}

variable "mongodb_user" { # stagging
  type      = string
  sensitive = true
  default   = null
}

variable "mongodb_password" { # stagging
  type      = string
  sensitive = true
  default   = null
}

variable "postgres_user" { # stagging
  type      = string
  sensitive = true
  default   = null
}

variable "postgres_password" { # stagging
  type      = string
  sensitive = true
  default   = null
}

variable "dest_db_uri" { # staging (temporary)
  type      = string
  sensitive = true
  default   = null
}

variable "orchestrator_address" {
  type      = string
  sensitive = true
}

variable "orchestrator_namespace" {
  type = string
}

variable "orchestrator_tls_enabled" {
  type = bool
}

variable "orchestrator_client_cert" {
  type      = string
  sensitive = true
}

variable "orchestrator_client_key" {
  type      = string
  sensitive = true
}

variable "upstash_kafka_region" { // upstash
  type = string
}

variable "s3_region" {
  type = string
}

variable "s3_bucket" {
  type = string
}

variable "s3_access_key" {
  type      = string
  sensitive = true
}

variable "s3_secret_key" {
  type      = string
  sensitive = true
}

variable "api_keys" {
  type      = string // splitted by comma
  sensitive = true
}

variable "processor_api_keys" {
  type      = string // splitted by comma
  sensitive = true
}

variable "harmonies_api_keys" {
  type      = string
  sensitive = true
}

variable "webhook_public_key" {
  type = string
}

variable "webhook_private_key" {
  type      = string
  sensitive = true
}

variable "microsoft_client_id" {
  type      = string
  sensitive = true
}

variable "microsoft_client_secret" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}


#domain
variable "letsencrypt_email" {
  type = string
}

variable "configurator_domain" {
  type = string #ex: configurator.starion-stagging.com
}

variable "webhook_trigger_domain" {
  type = string #ex: sync-webhook-trigger.starion-stagging.com
}

variable "formsync_domain" {
  type = string #ex: sync-form.starion-stagging.com
}

variable "replicas_count" {
  type    = number
  default = 1
}

#internal services
variable "downloader_url" {
  type = string
}

variable "comparer_url" {
  type = string
}

variable "loader_url" {
  type = string
}

variable "metadata_url" {
  type = string
}

# =====================  "kubernetes deployment config VARS =======================
variable "k8s_deployment_downloader" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_comparer" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_loader" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_metadata" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_configurator" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_webhook_trigger" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_formsync" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}


variable "k8s_deployment_cron_trigger" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_controller" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_worker" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_post_processor" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "k8s_deployment_webhook" {
  type = object({
    replicas = number
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
}

variable "GOOGLE_CREDENTIALS" {
  type      = string
  sensitive = true
}

variable "K3S_CLIENT_CERTIFICATE" {
  type      = string
  sensitive = true
  default   = ""
}
variable "K3S_CLIENT_KEY" {
  type      = string
  sensitive = true
  default   = ""
}
variable "K3S_CA_CERTIFICATE" {
  type      = string
  sensitive = true
  default   = ""
}

variable "K3S_ENDPOINT" {
  type      = string
  sensitive = true
  default   = ""
}
