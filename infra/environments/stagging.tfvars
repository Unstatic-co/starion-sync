project      = "starion-sync"
environment  = "stagging"
cluster_name = "staging-cluster"

github_owner     = "Unstatic-co"
github_repo_url  = "https://github.com/Unstatic-co/starion-sync"
github_repo_name = "starion-sync"
github_branch    = "stagging"

fly_region                    = "lax"
do_region                     = "nyc1"
gcp_project                   = "starion-stagging"
gcp_region                    = "us-central1"
gcp_secret_prefix             = "STARION_SYNC_"
gcp_deploy_service_account_id = "starion-sync-deploy"
gcp_docker_repository_name    = "starion-sync-images"
cf_account_id                 = "9bb00b4d4a3f274cfe341a3e963947bf"
cf_zone_id                    = ""
upstash_email                 = "hahoai@unstatic.co"
upstash_kafka_region          = "us-east-1"

mongodb_user             = "admin"
postgres_user            = "admin"

dest_db_schema = "next"
formsync_db_schema = "next"

redis_host = "" // internal k8s
redis_port = "" // internal k8s
redis_db                = 0

orchestrator_namespace   = "starion-sync-stagging.gin8b"
orchestrator_tls_enabled = true
# broker_uris          = ""
# kafka_sasl_username     = ""
# kafka_sasl_password     = ""
s3_region = "us-east-1"
s3_bucket = "starion-sync-stagging-data"

webhook_public_key = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz9sgUrblYtnyEL79bRYdFb8hr2SIS64QPyaA5ztwqdqbIeVB17LC57Y98EGPnsqw4RDwI9G6vS0/MQgZRSjpr9aKI7cdLkzbnRUxRYJbkANn+Mv/dR6gofUC9upbtZjVMf08eTUlJWY3adoBDA/OPvHfnmM21Ds5bKpTR2InB8/6NOJdV8xFmdHS4hGmGrOBSPUZbvmmuaFy0vjG5+rYn7fi/xAtIQ+Fen5Uc/xx95Ap2Azzif5tlI2NtoIpr1v2k5do9VmVmIKsk5SLvWAhuePJaziFxRQsLMR63MDMzPA6D3SseR1cUdiNXCeCoZiIMKgTXD+8rsJNCQjSZokGzQIDAQAB\n-----END PUBLIC KEY-----"

microsoft_client_id = "4bca9f40-7c40-48bb-9d25-faff5dfa926d"
google_client_id    = "547922925132-naqkb1pboc8ua54cj5gar0p43t030q70.apps.googleusercontent.com"

#domain
letsencrypt_email               = "khoihoang@unstatic.co"
letsencrypt_cluster_issuer_name = "backend-sync-letsencrypt-nginx"
configurator_domain             = "sync-configurator.starion-stagging.com"
webhook_trigger_domain          = "sync-webhook-trigger.starion-stagging.com"
formsync_domain                 = "sync-form.starion-stagging.com"
replicas_count                  = 1
downloader_url                  = "http://downloader.backend-sync-app.svc.cluster.local"
metadata_url                    = "http://metadata.backend-sync-app.svc.cluster.local"
comparer_url                    = "http://comparer.backend-sync-app.svc.cluster.local"
loader_url                      = "http://loader.backend-sync-app.svc.cluster.local"

#k8s config
k8s_deployment_downloader = {
  replicas = 2
  limits = {
    cpu    = "1.0"
    memory = "1Gi"
  }
  requests = {
    cpu    = "1m"
    memory = "100Mi"
  }
}

k8s_deployment_comparer = {
  replicas = 2
  limits = {
    cpu    = "500m"
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
    cpu    = "500m"
    memory = "256Mi"
  }
  requests = {
    cpu    = "1m"
    memory = "50Mi"
  }
}
k8s_deployment_metadata = {
  replicas = 1
  limits = {
    cpu    = "1"
    memory = "1Gi"
  }
  requests = {
    cpu    = "1m"
    memory = "50Mi"
  }
}

k8s_deployment_configurator = {
  replicas = 1
  limits = {
    cpu    = "300m"
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
    cpu    = "300m"
    memory = "256Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

k8s_deployment_cron_trigger = {
  replicas = 1
  limits = {
    cpu    = "300m"
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
    cpu    = "400m"
    memory = "512Mi"
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
    cpu    = "200m"
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
    cpu    = "300m"
    memory = "256Mi"
  }
  requests = {
    cpu    = "100m"
    memory = "128Mi"
  }
}
