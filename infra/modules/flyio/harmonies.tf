// **************************** Rate Limiter ****************************
locals {
  rate_limiter_path            = abspath("${path.root}/../harmonies/rate-limiter")
  rate_limiter_dockerfile_path = abspath("${local.rate_limiter_path}/Dockerfile")
  rate_limiter_files = sort(setunion(
    [
      local.rate_limiter_dockerfile_path,
      abspath("${path.module}/build/rate-limiter/fly.toml")
    ],
    [for f in fileset("${local.rate_limiter_path}", "**") : "${local.rate_limiter_path}/${f}"],
  ))
  rate_limiter_hash      = md5(join("", [for i in local.rate_limiter_files : filemd5(i)]))
  rate_limiter_image_url = "registry.fly.io/${local.rate_limiter_app_name}:${local.rate_limiter_hash}"
  rate_limiter_env = {
    NODE_ENV          = var.environment
    PORT              = "8080"
    LOG_LEVEL         = var.is_production ? "info" : "debug"
    API_KEYS          = join(",", var.harmonies_api_keys)
    REDIS_HOST        = local.redis_host
    REDIS_PORT        = local.redis_port
    REDIS_PASSWORD    = local.redis_password
    REDIS_TLS_ENABLED = local.redis_tls_enabled
    TRIGGER_REBUILD   = "true"
  }
}
resource "null_resource" "fly_app_rate_limiter" {
  count = local.rate_limiter_count
  triggers = {
    name = local.rate_limiter_app_name
    org  = var.organization
  }
  provisioner "local-exec" {
    when    = create
    command = "flyctl apps create ${local.rate_limiter_app_name} --org ${var.organization} -t $FLY_API_TOKEN"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "flyctl apps destroy ${self.triggers.name} --yes -t $FLY_API_TOKEN"
  }
}

resource "null_resource" "fly_ipv6_rate_limiter" {
  count = local.rate_limiter_count
  triggers = {
    app = local.rate_limiter_app_name
  }
  provisioner "local-exec" {
    command = "flyctl ips allocate-v6 -a ${local.rate_limiter_app_name} -t $FLY_API_TOKEN"
  }
  depends_on = [
    null_resource.fly_app_rate_limiter
  ]
}

resource "null_resource" "rate_limiter_builder" {
  count = local.rate_limiter_count
  triggers = {
    hash = local.rate_limiter_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN    = var.fly_api_token
      DOCKER_FILE         = local.rate_limiter_dockerfile_path
      DOCKER_IMAGE_NAME   = local.rate_limiter_app_name
      DOCKER_IMAGE_DIGEST = self.triggers.hash
    }
    working_dir = abspath("${path.root}/../")
  }

  depends_on = [
    null_resource.fly_app_rate_limiter
  ]
}

resource "null_resource" "fly_machine_rate_limiter" {
  count = local.rate_limiter_count
  triggers = {
    hash   = local.rate_limiter_hash
    region = var.region
    env    = jsonencode(local.rate_limiter_env)
  }

  provisioner "local-exec" {
    command     = <<EOT
      flyctl deploy . \
        -y -t $FLY_API_TOKEN \
        -c fly.toml \
        --strategy canary \
        -a ${local.rate_limiter_app_name} \
        -r ${self.triggers.region} \
        -i "${local.rate_limiter_image_url}" \
        ${join(" ", [for key, value in local.rate_limiter_env : "-e ${key}=\"${value}\""])}
    EOT
    working_dir = abspath("${path.module}/build/rate-limiter")
  }

  depends_on = [
    null_resource.fly_app_rate_limiter,
    null_resource.rate_limiter_builder,
    null_resource.fly_machine_redis,
  ]
}
