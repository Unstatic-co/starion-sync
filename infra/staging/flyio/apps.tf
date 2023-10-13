resource "fly_app" "apps" {
  name = "${var.project}-${var.environment}-apps"
  org  = var.organization
}

resource "fly_ip" "apps_ip_v4" {
  app  = fly_app.apps.name
  type = "v4"
}

resource "fly_ip" "apps_ip_v6" {
  app  = fly_app.apps.name
  type = "v6"
}

locals {
  apps_files = [
    "${path.module}/build/apps/Dockerfile",
    "${path.module}/build/apps/apps.json",
  ]
  apps_hash = md5(join("", [for i in local.apps_files : filemd5(i)]))
}

resource "null_resource" "apps_builder" {
  triggers = {
    sha1 = local.apps_hash
  }

  provisioner "local-exec" {
    command = abspath("${path.module}/build-image.sh")
    interpreter = [
      "/bin/bash"
    ]
    environment = {
      FLY_ACCESS_TOKEN = var.api_token

      DOCKER_FILE         = abspath("${path.module}/build/apps/Dockerfile")
      DOCKER_IMAGE_NAME   = fly_app.apps.name
      DOCKER_IMAGE_DIGEST = local.apps_hash

      # ARGS = "--build-arg PASS=${var.redis_password}}"
    }
    working_dir = abspath("${path.root}/../../")
  }
}

resource "fly_machine" "apps" {
  app    = fly_app.apps.name
  region = var.region
  name   = "${var.project}-${var.environment}-apps"

  cpus     = 2
  memorymb = 2048

  image = "registry.fly.io/${fly_app.apps.name}:${local.apps_hash}"

  # lifecycle {
  # prevent_destroy = true
  # }

  services = [
    {
      "protocol" : "tcp",
      "ports" : [
        {
          port = 8080
        }
      ],
      "internal_port" : 8080,
    }
  ]

  env = {
    NODE_ENV  = var.environment
    LOG_LEVEL = "info"
  }

  depends_on = [
    null_resource.apps_builder,
  ]
}
