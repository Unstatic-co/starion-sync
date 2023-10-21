# ******************* DOWNLOADER *******************

data "google_container_registry_image" "downloader" {
  name   = "downloader"
  tag    = local.downloader_hash
  digest = local.downloader_hash
}

locals {
  downloader_path = "${path.root}/../../apps/processors/downloader"
  downloader_files = sort(setunion(
    [for f in fileset("${local.downloader_path}", "**") : "${local.downloader_path}/${f}"],
  ))
  downloader_hash = md5(join("", [for i in local.downloader_files : filemd5(i)]))
}

resource "null_resource" "downloader_builder" {
  triggers = {
    hash = local.downloader_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      PROJECT    = var.gcp_project
      WORKDIR    = abspath(local.downloader_path)
      IMAGE_NAME = "${data.google_container_registry_image.downloader.name}:${local.downloader_hash}"
    }
    working_dir = abspath(path.module)
  }
}

resource "google_cloud_run_service" "downloader" {
  name     = "downloader"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = data.google_container_registry_image.downloader.image_url
        resources {
          limits = {
            cpu    = 1
            memory = "512Mi"
          }
        }
        env {
          name  = "PRODUCTION"
          value = "true"
        }
        env {
          name  = "LOG_LEVEL"
          value = "debug"
        }
        env {
          name  = "API_KEYS"
          value = join(",", var.processor_api_keys)
        }
        env {
          name  = "S3_ENDPOINT"
          value = var.s3_endpoint
        }
        env {
          name  = "S3_REGION"
          value = var.s3_region
        }
        env {
          name  = "S3_DIFF_DATA_BUCKET"
          value = var.s3_bucket
        }
        env {
          name  = "S3_ACCESS_KEY"
          value = var.s3_access_key
        }
        env {
          name  = "S3_SECRET_KEY"
          value = var.s3_secret_key
        }
        env {
          name  = "S3_SSL"
          value = "true"
        }
      }
      timeout_seconds       = 310
      container_concurrency = 20
    }
    metadata {
      annotations = {
        "run.googleapis.com/execution-environment" = "gen2"
        "autoscaling.knative.dev/maxScale"         = "5"
      }
    }
  }

  depends_on = [
    null_resource.downloader_builder,
  ]
}

resource "google_cloud_run_service_iam_member" "downloader_invoker" {
  location = google_cloud_run_service.downloader.location
  service  = google_cloud_run_service.downloader.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ******************* COMPARER *******************

data "google_container_registry_image" "comparer" {
  name   = "comparer"
  tag    = local.comparer_hash
  digest = local.comparer_hash
}

locals {
  comparer_path = "${path.root}/../../apps/processors/comparer"
  comparer_files = sort(setunion(
    [for f in fileset("${local.comparer_path}", "**") : "${local.comparer_path}/${f}"],
  ))
  comparer_hash = md5(join("", [for i in local.comparer_files : filemd5(i)]))
}

resource "null_resource" "comparer_builder" {
  triggers = {
    hash = local.comparer_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      PROJECT    = var.gcp_project
      WORKDIR    = abspath(local.comparer_path)
      IMAGE_NAME = "${data.google_container_registry_image.comparer.name}:${local.comparer_hash}"
    }
    working_dir = abspath(path.module)
  }
}

resource "google_cloud_run_service" "comparer" {
  name     = "comparer"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = data.google_container_registry_image.comparer.image_url
        resources {
          limits = {
            cpu    = 1
            memory = "256Mi"
          }
        }
        env {
          name  = "PRODUCTION"
          value = "true"
        }
        env {
          name  = "LOG_LEVEL"
          value = "debug"
        }
        env {
          name  = "API_KEYS"
          value = join(",", var.processor_api_keys)
        }
        env {
          name  = "S3_ENDPOINT"
          value = var.s3_endpoint
        }
        env {
          name  = "S3_REGION"
          value = var.s3_region
        }
        env {
          name  = "S3_DIFF_DATA_BUCKET"
          value = var.s3_bucket
        }
        env {
          name  = "S3_ACCESS_KEY"
          value = var.s3_access_key
        }
        env {
          name  = "S3_SECRET_KEY"
          value = var.s3_secret_key
        }
        env {
          name  = "S3_SSL"
          value = "true"
        }
      }
      timeout_seconds       = 130
      container_concurrency = 10
    }
    metadata {
      annotations = {
        # "run.googleapis.com/execution-environment" = "gen2"
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }

  depends_on = [
    null_resource.comparer_builder,
  ]
}

resource "google_cloud_run_service_iam_member" "comparer_invoker" {
  location = google_cloud_run_service.comparer.location
  service  = google_cloud_run_service.comparer.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ******************* LOADER *******************

data "google_container_registry_image" "loader" {
  name   = "loader"
  tag    = local.loader_hash
  digest = local.loader_hash
}

locals {
  loader_path = "${path.root}/../../apps/processors/loader"
  loader_files = sort(setunion(
    [for f in fileset("${local.loader_path}", "**") : "${local.loader_path}/${f}"],
  ))
  loader_hash = md5(join("", [for i in local.loader_files : filemd5(i)]))
}

resource "null_resource" "loader_builder" {
  triggers = {
    hash = local.loader_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      PROJECT    = var.gcp_project
      WORKDIR    = abspath(local.loader_path)
      IMAGE_NAME = "${data.google_container_registry_image.loader.name}:${local.loader_hash}"
    }
    working_dir = abspath(path.module)
  }
}

resource "google_cloud_run_service" "loader" {
  name     = "loader"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = data.google_container_registry_image.loader.image_url
        resources {
          limits = {
            cpu    = 1
            memory = "256Mi"
          }
        }
        env {
          name  = "PRODUCTION"
          value = "true"
        }
        env {
          name  = "LOG_LEVEL"
          value = "debug"
        }
        env {
          name  = "API_KEYS"
          value = join(",", var.processor_api_keys)
        }
        env {
          name  = "DB_TYPE"
          value = "postgres"
        }
        env {
          name  = "DB_URI"
          value = var.postgres_uri
        }
        env {
          name  = "S3_ENDPOINT"
          value = var.s3_endpoint
        }
        env {
          name  = "S3_REGION"
          value = var.s3_region
        }
        env {
          name  = "S3_DIFF_DATA_BUCKET"
          value = var.s3_bucket
        }
        env {
          name  = "S3_ACCESS_KEY"
          value = var.s3_access_key
        }
        env {
          name  = "S3_SECRET_KEY"
          value = var.s3_secret_key
        }
        env {
          name  = "S3_SSL"
          value = "true"
        }
      }
      timeout_seconds       = 310
      container_concurrency = 5
    }
    metadata {
      annotations = {
        # "run.googleapis.com/execution-environment" = "gen2"
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }

  depends_on = [
    null_resource.loader_builder,
  ]
}

resource "google_cloud_run_service_iam_member" "loader_invoker" {
  location = google_cloud_run_service.loader.location
  service  = google_cloud_run_service.loader.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ******************* METADATA *******************

data "google_container_registry_image" "metadata" {
  name   = "metadata"
  tag    = local.metadata_hash
  digest = local.metadata_hash
}

locals {
  metadata_path = "${path.root}/../../form-sync/module/metadata"
  metadata_files = sort(setunion(
    [for f in fileset("${local.metadata_path}", "**") : "${local.metadata_path}/${f}"],
  ))
  metadata_hash = md5(join("", [for i in local.metadata_files : filemd5(i)]))
}

resource "null_resource" "metadata_builder" {
  triggers = {
    hash = local.metadata_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      PROJECT    = var.gcp_project
      WORKDIR    = abspath(local.metadata_path)
      IMAGE_NAME = "${data.google_container_registry_image.metadata.name}:${local.metadata_hash}"
    }
    working_dir = abspath(path.module)
  }
}

resource "google_cloud_run_service" "metadata" {
  name     = "metadata"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = data.google_container_registry_image.metadata.image_url
        resources {
          limits = {
            cpu    = 1
            memory = "128Mi"
          }
        }
        env {
          name  = "PRODUCTION"
          value = "true"
        }
        env {
          name  = "LOG_LEVEL"
          value = "debug"
        }
        // env {
        // name  = "API_KEYS"
        // value = join(",", var.processor_api_keys)
        // }
        env {
          name  = "DB_URI"
          value = var.mongodb_uri
        }
      }
      timeout_seconds       = 310
      container_concurrency = 5
    }
    metadata {
      annotations = {
        # "run.googleapis.com/execution-environment" = "gen2"
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }

  depends_on = [
    null_resource.metadata_builder,
  ]
}

resource "google_cloud_run_service_iam_member" "metadata_invoker" {
  location = google_cloud_run_service.metadata.location
  service  = google_cloud_run_service.metadata.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
