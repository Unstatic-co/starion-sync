resource "google_secret_manager_secret" "fly_api_token" {
  secret_id = "${var.gcp_secret_prefix}_FLY_API_TOKEN"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "cf_api_token" {
  secret_id = "${var.gcp_secret_prefix}_CF_API_TOKEN"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "redis_password" {
  secret_id = "${var.gcp_secret_prefix}_REDIS_PASSWORD"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "mongodb_password" {
  secret_id = "${var.gcp_secret_prefix}_MONGODB_PASSWORD"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "s3_access_key" {
  secret_id = "${var.gcp_secret_prefix}_S3_ACCESS_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "s3_secret_key" {
  secret_id = "${var.gcp_secret_prefix}_S3_SECRET_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "api_keys" {
  secret_id = "${var.gcp_secret_prefix}_API_KEYS"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "processor_api_keys" {
  secret_id = "${var.gcp_secret_prefix}_PROCESSOR_API_KEYS"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "webhook_private_key" {
  secret_id = "${var.gcp_secret_prefix}_WEBHOOK_PRIVATE_KEY"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "${var.gcp_secret_prefix}_GOOGLE_CLIENT_SECRET"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "microsoft_client_secret" {
  secret_id = "${var.gcp_secret_prefix}_MICROSOFT_CLIENT_SECRET"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "dest_db_uri" {
  secret_id = "${var.gcp_secret_prefix}_DEST_DB_URI"

  replication {
    auto {}
  }
}
