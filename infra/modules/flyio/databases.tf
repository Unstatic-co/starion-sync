// ********************* Redis *********************

resource "fly_app" "redis" {
  count = local.redis_count

  name = "${var.project}-${var.environment}-redis"
  org  = var.organization
}

resource "fly_ip" "redis_ip_v4" {
  count = local.redis_count

  app  = fly_app.redis[0].name
  type = "v4"
}

resource "fly_ip" "redis_ip_v6" {
  count = local.redis_count

  app  = fly_app.redis[0].name
  type = "v6"
}

locals {
  redis_files = [
    "${path.module}/build/redis/Dockerfile",
  ]
  redis_hash = md5(join("", [for i in local.redis_files : filemd5(i)]))
}

resource "null_resource" "redis_builder" {
  count = local.redis_count

  triggers = {
    sha1 = local.redis_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN = var.fly_api_token

      DOCKER_FILE         = "Dockerfile"
      DOCKER_IMAGE_NAME   = fly_app.redis[0].name
      DOCKER_IMAGE_DIGEST = local.redis_hash

      ARGS = "--build-arg PASS=${var.redis_password}}"
    }
    working_dir = abspath("${path.module}/build/redis")
  }
}

resource "fly_machine" "redis" {
  count = local.redis_count

  app    = fly_app.redis[0].name
  region = var.region
  name   = "${var.project}-${var.environment}-redis"

  cpus     = 1
  memorymb = 256

  # image = "registry.fly.io/${fly_app.redis.name}:${local.redis_sha1}"
  image = "registry.fly.io/${fly_app.redis[0].name}:${local.redis_hash}"

  # lifecycle {
  # prevent_destroy = true
  # }

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port = 6379
        }
      ],
      "internal_port" : 6379,
    }
  ]

  env = {
    REDIS_PASSWORD = var.redis_password
  }

  depends_on = [
    null_resource.redis_builder,
  ]
}

// ********************* MongoDB *********************

resource "fly_app" "mongodb" {
  count = local.mongodb_count

  name = "${var.project}-${var.environment}-mongodb"
  org  = var.organization
}

resource "fly_ip" "mongodb_ip_v4" {
  count = local.mongodb_count

  app  = fly_app.mongodb[0].name
  type = "v4"
}

resource "fly_ip" "mongodb_ip_v6" {
  count = local.mongodb_count

  app  = fly_app.mongodb[0].name
  type = "v6"
}

locals {
  mongodb_files = [
    "${path.module}/build/mongodb/Dockerfile",
  ]
  mongodb_hash = md5(join("", [for i in local.mongodb_files : filemd5(i)]))
}

resource "null_resource" "mongodb_builder" {
  count = local.mongodb_count

  triggers = {
    sha1 = local.mongodb_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN = var.fly_api_token

      DOCKER_FILE         = "Dockerfile"
      DOCKER_IMAGE_NAME   = fly_app.mongodb[0].name
      DOCKER_IMAGE_DIGEST = local.mongodb_hash
    }
    working_dir = abspath("${path.module}/build/mongodb")
  }
}

resource "fly_machine" "mongodb" {
  count = local.mongodb_count

  app    = fly_app.mongodb[0].name
  region = var.region
  name   = "${var.project}-${var.environment}-mongodb"

  cpus     = 1
  memorymb = 512

  image = "registry.fly.io/${fly_app.mongodb[0].name}:${local.mongodb_hash}"

  # lifecycle {
  # prevent_destroy = true
  # }

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port = 27017
        }
      ],
      "internal_port" : 27017,
    }
  ]

  env = {
    MONGO_INITDB_ROOT_USERNAME = var.mongodb_user
    MONGO_INITDB_ROOT_PASSWORD = var.mongodb_password
    MONGO_INITDB_DATABASE      = "starion-sync"
  }

  depends_on = [
    null_resource.mongodb_builder,
  ]
}

resource "null_resource" "mongodb_replica_set_setup" {
  count = local.mongodb_count

  triggers = {
    hash = local.mongodb_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build/mongodb/init.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN           = var.fly_api_token
      FLY_MACHINE_ID             = fly_machine.mongodb[0].id
      FLY_APP                    = fly_app.mongodb[0].name
      MONGO_INITDB_ROOT_USERNAME = var.mongodb_user
      MONGO_INITDB_ROOT_PASSWORD = var.mongodb_password
    }
  }

  depends_on = [
    fly_machine.mongodb,
  ]
}

// ********************* Postgres *********************

resource "fly_app" "postgres" {
  count = local.postgres_count

  name = "${var.project}-${var.environment}-postgres"
  org  = var.organization
}

resource "fly_ip" "postgres_ip_v4" {
  count = local.postgres_count

  app  = fly_app.postgres[0].name
  type = "v4"
}

resource "fly_ip" "postgres_ip_v6" {
  count = local.postgres_count

  app  = fly_app.postgres[0].name
  type = "v6"
}

locals {
  postgres_files = [
    "${path.module}/build/postgres/Dockerfile",
  ]
  postgres_hash = md5(join("", [for i in local.postgres_files : filemd5(i)]))
}

resource "null_resource" "postgres_builder" {
  count = local.postgres_count

  triggers = {
    sha1 = local.postgres_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN = var.fly_api_token

      DOCKER_FILE         = "Dockerfile"
      DOCKER_IMAGE_NAME   = fly_app.postgres[0].name
      DOCKER_IMAGE_DIGEST = local.postgres_hash
    }
    working_dir = abspath("${path.module}/build/postgres")
  }
}

resource "fly_machine" "postgres" {
  count = local.postgres_count

  app    = fly_app.postgres[0].name
  region = var.region
  name   = "${var.project}-${var.environment}-postgres"

  cpus     = 2
  memorymb = 512

  image = "registry.fly.io/${fly_app.postgres[0].name}:${local.postgres_hash}"

  # lifecycle {
  # prevent_destroy = true
  # }

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port = 5432
        }
      ],
      "internal_port" : 5432,
    }
  ]

  env = {
    POSTGRES_USER     = var.postgres_user
    POSTGRES_PASSWORD = var.postgres_password
    POSTGRES_DB       = "starion-sync"
  }

  depends_on = [
    null_resource.postgres_builder,
  ]
}
