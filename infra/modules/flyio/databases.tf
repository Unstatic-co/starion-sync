// **************************** Redis New ****************************
locals {
  redis_dockerfile_path = abspath("${path.module}/build/redis/Dockerfile")
  redis_files = sort(setunion(
    [
      local.redis_dockerfile_path,
      abspath("${path.module}/build/redis/fly.toml")
    ],
  ))
  redis_hash      = md5(join("", [for i in local.redis_files : filemd5(i)]))
  redis_image_url = "registry.fly.io/${local.redis_app_name}:${local.redis_hash}"
  redis_env = {
    REDIS_PASSWORD = var.redis_password
  }
}
resource "null_resource" "fly_app_redis" {
  count = local.redis_count
  triggers = {
    name = local.redis_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.redis_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv4_redis" {
  count = local.redis_count
  triggers = {
    app = local.redis_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v4 -a ${local.redis_app_name} -y -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_redis
  ]
}
resource "null_resource" "fly_ipv6_redis" {
  count = local.redis_count
  triggers = {
    app = local.redis_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.redis_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_redis
  ]
}

resource "null_resource" "redis_builder" {
  count = local.redis_count
  triggers = {
    hash = local.redis_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = local.redis_dockerfile_path
      DOCKER_IMAGE_NAME   = local.redis_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
      ARGS                = "--build-arg REDIS_PASSWORD=${var.redis_password}"
    }
    working_dir = abspath("${path.module}/build/redis")
  }
}

resource "null_resource" "fly_machine_redis" {
  count = local.redis_count
  triggers = {
    hash           = local.redis_hash
    env            = jsonencode(local.redis_env)
    trigger_deploy = "false"
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
        -y -t $FLY_API_TOKEN \
        -a ${local.redis_app_name} \
        -i "${local.redis_image_url}" \
        ${join(" ", [for key, value in local.redis_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/redis")
  }

  depends_on = [
    null_resource.fly_app_redis,
    null_resource.redis_builder
  ]
}

// **************************** Mongodb New ****************************
locals {
  mongodb_dockerfile_path = "${path.module}/build/mongodb/Dockerfile"
  mongodb_files = sort(setunion(
    [
      local.mongodb_dockerfile_path,
      "${path.module}/build/mongodb/fly.toml"
    ],
  ))
  mongodb_hash      = md5(join("", [for i in local.mongodb_files : filemd5(i)]))
  mongodb_image_url = "registry.fly.io/${local.mongodb_app_name}:${local.mongodb_hash}"
  mongodb_env = {
    MONGO_INITDB_ROOT_USERNAME = var.mongodb_user
    MONGO_INITDB_ROOT_PASSWORD = var.mongodb_password
    MONGO_INITDB_DATABASE      = "starion-sync"
  }
}
resource "null_resource" "fly_app_mongodb" {
  count = local.mongodb_count
  triggers = {
    name = local.mongodb_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.mongodb_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv4_mongodb" {
  count = local.mongodb_count
  triggers = {
    app = local.mongodb_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v4 -a ${local.mongodb_app_name} -y -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_mongodb
  ]
}
resource "null_resource" "fly_ipv6_mongodb" {
  count = local.mongodb_count
  triggers = {
    app = local.mongodb_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.mongodb_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_mongodb
  ]
}

resource "null_resource" "mongodb_builder" {
  count = local.mongodb_count
  triggers = {
    hash = local.mongodb_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = local.mongodb_dockerfile_path
      DOCKER_IMAGE_NAME   = local.mongodb_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
    }
    working_dir = abspath("${path.module}/build/mongodb")
  }
}

resource "null_resource" "fly_machine_mongodb" {
  count = local.mongodb_count
  triggers = {
    hash = local.mongodb_hash
    env  = jsonencode(local.mongodb_env)
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
        -y -t $FLY_API_TOKEN \
        -a ${local.mongodb_app_name} \
        -i "${local.mongodb_image_url}" \
        ${join(" ", [for key, value in local.mongodb_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/mongodb")
  }

  depends_on = [
    null_resource.fly_app_mongodb,
    null_resource.mongodb_builder
  ]
}

# resource "null_resource" "mongodb_replica_set_setup" {
# count = local.mongodb_count

# triggers = {
# hash = local.mongodb_hash
# }

# provisioner "local-exec" {
# command = abspath("${path.module}/build/mongodb/init.sh")
# interpreter = [
# "/bin/bash"
# ]
# environment = {
# FLY_ACCESS_TOKEN           = var.fly_api_token
# FLY_MACHINE_ID             = fly_machine.mongodb[0].id
# FLY_APP                    = fly_app.mongodb[0].name
# MONGO_INITDB_ROOT_USERNAME = var.mongodb_user
# MONGO_INITDB_ROOT_PASSWORD = var.mongodb_password
# }
# }

# depends_on = [
# fly_machine.mongodb,
# ]
# }

// // ********************* Postgres *********************

// resource "fly_app" "postgres" {
// count = local.postgres_count

// name = "${var.project}-${var.environment}-postgres"
// org  = var.organization
// }

// resource "fly_ip" "postgres_ip_v4" {
// count = local.postgres_count

// app  = fly_app.postgres[0].name
// type = "v4"
// }

// resource "fly_ip" "postgres_ip_v6" {
// count = local.postgres_count

// app  = fly_app.postgres[0].name
// type = "v6"
// }

// locals {
// postgres_files = [
// "${path.module}/build/postgres/Dockerfile",
// ]
// postgres_hash = md5(join("", [for i in local.postgres_files : filemd5(i)]))
// }

// resource "null_resource" "postgres_builder" {
// count = local.postgres_count

// triggers = {
// sha1 = local.postgres_hash
// }

// provisioner "local-exec" {
// command = abspath("${path.module}/build-image.sh")
// interpreter = [
// "/bin/bash"
// ]
// environment = {
// FLY_ACCESS_TOKEN = var.fly_api_token

// DOCKER_FILE         = "Dockerfile"
// DOCKER_IMAGE_NAME   = fly_app.postgres[0].name
// DOCKER_IMAGE_DIGEST = local.postgres_hash
// }
// working_dir = abspath("${path.module}/build/postgres")
// }
// }

// resource "fly_machine" "postgres" {
// count = local.postgres_count

// app    = fly_app.postgres[0].name
// region = var.region
// name   = "${var.project}-${var.environment}-postgres"

// cpus     = 2
// memorymb = 512

// image = "registry.fly.io/${fly_app.postgres[0].name}:${local.postgres_hash}"

// # lifecycle {
// # prevent_destroy = true
// # }

// services = [
// {
// "protocol" : "tcp",
// "ports" : [
// {
// port = 5432
// }
// ],
// "internal_port" : 5432,
// }
// ]

// env = {
// POSTGRES_USER     = var.postgres_user
// POSTGRES_PASSWORD = var.postgres_password
// POSTGRES_DB       = "starion-sync"
// }

// depends_on = [
// null_resource.postgres_builder,
// ]
// }
