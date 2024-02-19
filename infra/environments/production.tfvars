project     = "starion-sync"
environment = "production"

github_owner     = "Unstatic-co"
github_repo_url  = "https://github.com/Unstatic-co/starion-sync"
github_repo_name = "starion-sync"
github_branch    = "main"

fly_region                    = "lax"
do_region                     = "nyc1"
gcp_project                   = "starion-io"
gcp_region                    = "us-central1"
gcp_secret_prefix             = "STARION_SYNC_"
gcp_deploy_service_account_id = "service-deployment-terraform"
gcp_docker_repository_name    = "starion-sync-images"
cf_account_id                 = "9bb00b4d4a3f274cfe341a3e963947bf"
cf_zone_id                    = ""
upstash_email                 = "hahoai@unstatic.co"
upstash_kafka_region          = "us-east-1"

mongodb_user             = "admin"
postgres_user            = "admin"
orchestrator_namespace   = "starion-sync-production.gin8b"
orchestrator_tls_enabled = true
# broker_uris          = ""
# kafka_sasl_username     = ""
# kafka_sasl_password     = ""
s3_region = "us-east-1"
s3_bucket = "starion-sync-production-data"

webhook_public_key = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz9sgUrblYtnyEL79bRYdFb8hr2SIS64QPyaA5ztwqdqbIeVB17LC57Y98EGPnsqw4RDwI9G6vS0/MQgZRSjpr9aKI7cdLkzbnRUxRYJbkANn+Mv/dR6gofUC9upbtZjVMf08eTUlJWY3adoBDA/OPvHfnmM21Ds5bKpTR2InB8/6NOJdV8xFmdHS4hGmGrOBSPUZbvmmuaFy0vjG5+rYn7fi/xAtIQ+Fen5Uc/xx95Ap2Azzif5tlI2NtoIpr1v2k5do9VmVmIKsk5SLvWAhuePJaziFxRQsLMR63MDMzPA6D3SseR1cUdiNXCeCoZiIMKgTXD+8rsJNCQjSZokGzQIDAQAB\n-----END PUBLIC KEY-----"

microsoft_client_id = "8917884e-c88b-42ad-8d3c-1a06424f09d2"
google_client_id    = "264150731939-feqpvu0c1t8nqdb0gim3kp0mop9eoc2o.apps.googleusercontent.com"

# dest_db_uri = "" # temporary

k8s_deployment_downloader = {
  replicas = 1
  limits = {
    cpu    = "100m"
    memory = "1024Mi"
  }
  requests = {
    cpu    = "1m"
    memory = "50Mi"
  }
}

k8s_deployment_comparer = {
  replicas = 1
  limits = {
    cpu    = "100m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "1m"
    memory = "50Mi"
  }
}
k8s_deployment_loader = {
  replicas = 1
  limits = {
    cpu    = "100m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "1m"
    memory = "50Mi"
  }
}
k8s_deployment_metadata = {
  replicas = 1
  limits = {
    cpu    = "100m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "1m"
    memory = "50Mi"
  }
}

k8s_deployment_configurator = {
  replicas = 1
  limits = {
    cpu    = "500m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "512Mi"
  }
}

k8s_deployment_webhook_trigger = {
  replicas = 1
  limits = {
    cpu    = "200m"
    memory = "256Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

k8s_deployment_formsync = {
  replicas = 1
  limits = {
    cpu    = "200m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

k8s_deployment_cron_trigger = {
  replicas = 1
  limits = {
    cpu    = "500m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

k8s_deployment_controller = {
  replicas = 1
  limits = {
    cpu    = "500m"
    memory = "1024Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "512Mi"
  }
}

k8s_deployment_worker = {
  replicas = 1
  limits = {
    cpu    = "500m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "256Mi"
  }
}

k8s_deployment_post_processor = {
  replicas = 1
  limits = {
    cpu    = "500m"
    memory = "512Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "256Mi"
  }
}


k8s_deployment_webhook = {
  replicas = 1
  limits = {
    cpu    = "500m"
    memory = "256Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "128Mi"
  }
}