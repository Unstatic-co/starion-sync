locals {
  postgres_uri = "postgres://${var.postgres_user}:${var.postgres_password}@starion-sync-stagging-postgres.fly.dev:5432/starion-sync?sslmode=disable"
  mongodb_uri  = "mongodb://${var.mongodb_user}:${var.mongodb_password}@starion-sync-stagging-mongodb.fly.dev:27017/starion-sync?directConnection=true&authSource=admin"
}

# *********************************************** DOWNLOADER ***********************************************

resource "fly_app" "downloader" {
  name = "${var.project}-${var.environment}-downloader"
  org  = var.organization
}

resource "fly_ip" "downloader_ip_v4" {
  app  = fly_app.downloader.name
  type = "v4"
}

resource "fly_ip" "downloader_ip_v6" {
  app  = fly_app.downloader.name
  type = "v6"
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
      FLY_ACCESS_TOKEN = var.fly_api_token

      DOCKER_FILE         = abspath("${local.downloader_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.downloader.name
      DOCKER_IMAGE_DIGEST = local.downloader_hash
    }
    working_dir = abspath(local.downloader_path)
  }
}

resource "fly_machine" "downloader" {
  app    = fly_app.downloader.name
  region = var.region
  name   = "${var.project}-${var.environment}-downloader"

  cpus     = 1
  memorymb = 256

  image = "registry.fly.io/${fly_app.downloader.name}:${local.downloader_hash}"

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port : 443,
          handlers : [
            "tls",
            "http"
          ]
        },
        {
          "port" : 80,
          "handlers" : [
            "http"
          ]
        }
      ],
      "internal_port" : 8080,
    }
  ]

  env = {
    PRODUCTION          = "true"
    API_KEYS            = join(",", var.processor_api_keys)
    S3_ENDPOINT         = var.s3_endpoint
    S3_REGION           = var.s3_region
    S3_DIFF_DATA_BUCKET = var.s3_bucket
    S3_ACCESS_KEY       = var.s3_access_key
    S3_SECRET_KEY       = var.s3_secret_key
    S3_SSL              = true
  }

  depends_on = [
    null_resource.downloader_builder
  ]
}

# *********************************************** COMPARER ***********************************************

resource "fly_app" "comparer" {
  name = "${var.project}-${var.environment}-comparer"
  org  = var.organization
}

resource "fly_ip" "comparer_ip_v4" {
  app  = fly_app.comparer.name
  type = "v4"
}

resource "fly_ip" "comparer_ip_v6" {
  app  = fly_app.comparer.name
  type = "v6"
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
      FLY_ACCESS_TOKEN = var.fly_api_token

      DOCKER_FILE         = abspath("${local.comparer_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.comparer.name
      DOCKER_IMAGE_DIGEST = local.comparer_hash
    }
    working_dir = abspath(local.comparer_path)
  }
}

resource "fly_machine" "comparer" {
  app    = fly_app.comparer.name
  region = var.region
  name   = "${var.project}-${var.environment}-comparer"

  cpus     = 1
  memorymb = 256

  image = "registry.fly.io/${fly_app.comparer.name}:${local.comparer_hash}"

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port : 443,
          handlers : [
            "tls",
            "http"
          ]
        },
        {
          "port" : 80,
          "handlers" : [
            "http"
          ]
        }
      ],
      "internal_port" : 8080,
    }
  ]

  env = {
    PRODUCTION          = "true"
    API_KEYS            = join(",", var.processor_api_keys)
    S3_ENDPOINT         = var.s3_endpoint
    S3_REGION           = var.s3_region
    S3_DIFF_DATA_BUCKET = var.s3_bucket
    S3_ACCESS_KEY       = var.s3_access_key
    S3_SECRET_KEY       = var.s3_secret_key
    S3_SSL              = true
  }

  depends_on = [
    null_resource.comparer_builder
  ]
}

# *********************************************** LOADER ***********************************************

resource "fly_app" "loader" {
  name = "${var.project}-${var.environment}-loader"
  org  = var.organization
}

resource "fly_ip" "loader_ip_v4" {
  app  = fly_app.loader.name
  type = "v4"
}

resource "fly_ip" "loader_ip_v6" {
  app  = fly_app.loader.name
  type = "v6"
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
      FLY_ACCESS_TOKEN = var.fly_api_token

      DOCKER_FILE         = abspath("${local.loader_path}/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.loader.name
      DOCKER_IMAGE_DIGEST = local.loader_hash
    }
    working_dir = abspath(local.loader_path)
  }
}

resource "fly_machine" "loader" {
  app    = fly_app.loader.name
  region = var.region
  name   = "${var.project}-${var.environment}-loader"

  cpus     = 1
  memorymb = 256

  image = "registry.fly.io/${fly_app.loader.name}:${local.loader_hash}"

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port : 443,
          handlers : [
            "tls",
            "http"
          ]
        },
        {
          "port" : 80,
          "handlers" : [
            "http"
          ]
        }
      ],
      "internal_port" : 8080,
    }
  ]

  env = {
    PRODUCTION          = "true"
    API_KEYS            = join(",", var.processor_api_keys)
    S3_ENDPOINT         = var.s3_endpoint
    S3_REGION           = var.s3_region
    S3_DIFF_DATA_BUCKET = var.s3_bucket
    S3_ACCESS_KEY       = var.s3_access_key
    S3_SECRET_KEY       = var.s3_secret_key
    S3_SSL              = true
    DB_TYPE             = "postgres"
    DB_URI              = local.postgres_uri
  }

  depends_on = [
    null_resource.loader_builder
  ]
}
