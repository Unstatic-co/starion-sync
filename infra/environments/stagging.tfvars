project     = "starion-sync"
environment = "stagging"

github_owner     = "Unstatic-co"
github_repo_url  = "https://github.com/Unstatic-co/starion-sync"
github_repo_name = "starion-sync"

fly_region                    = "lax"
gcp_project                   = "starion-stagging"
gcp_region                    = "us-central1"
gcp_secret_prefix             = "STARION_SYNC_"
gcp_deploy_service_account_id = "starion-sync-deploy"
gcp_docker_repository_name    = "starion-sync-images"
cf_account_id                 = "9bb00b4d4a3f274cfe341a3e963947bf"
cf_zone_id                    = ""
upstash_email                 = "hahoai@unstatic.co"
upstash_kafka_region          = "us-east-1"

mongodb_user      = "admin"
postgres_user     = "admin"
postgres_password = "123456"
# broker_uris          = ""
# kafka_sasl_username     = ""
# kafka_sasl_password     = ""
s3_endpoint = "https://9bb00b4d4a3f274cfe341a3e963947bf.r2.cloudflarestorage.com"
s3_region   = "us-east-1"
s3_bucket   = "starion-sync-stagging-data"

webhook_public_key = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz9sgUrblYtnyEL79bRYdFb8hr2SIS64QPyaA5ztwqdqbIeVB17LC57Y98EGPnsqw4RDwI9G6vS0/MQgZRSjpr9aKI7cdLkzbnRUxRYJbkANn+Mv/dR6gofUC9upbtZjVMf08eTUlJWY3adoBDA/OPvHfnmM21Ds5bKpTR2InB8/6NOJdV8xFmdHS4hGmGrOBSPUZbvmmuaFy0vjG5+rYn7fi/xAtIQ+Fen5Uc/xx95Ap2Azzif5tlI2NtoIpr1v2k5do9VmVmIKsk5SLvWAhuePJaziFxRQsLMR63MDMzPA6D3SseR1cUdiNXCeCoZiIMKgTXD+8rsJNCQjSZokGzQIDAQAB\n-----END PUBLIC KEY-----"

microsoft_client_id = "4bca9f40-7c40-48bb-9d25-faff5dfa926d"
google_client_id    = "547922925132-naqkb1pboc8ua54cj5gar0p43t030q70.apps.googleusercontent.com"

# dest_db_uri = "" # temporary
