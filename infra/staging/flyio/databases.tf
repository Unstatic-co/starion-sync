# // ********************* Redis *********************

# resource "fly_app" "redis" {
# name = "${var.project}-${var.environment}-redis"
# org  = var.organization
# }

# # resource "fly_ip" "redis_ip_v4" {
# # app  = fly_app.redis.name
# # type = "v4"
# # }

# # resource "fly_ip" "redis_ip_v6" {
# # app  = fly_app.redis.name
# # type = "v6"
# # }

# locals {
# redis_files = [
# "${path.module}/build/redis/redis.dockerfile",
# ]
# redis_sha1 = sha1(join("", [for i in local.redis_files : filesha1(i)]))
# }

# resource "null_resource" "redis_builder" {
# triggers = {
# sha1 = local.redis_sha1
# }

# provisioner "local-exec" {
# command = abspath("${path.module}/build-image.sh")
# interpreter = [
# "bash",
# ]
# environment = {
# FLY_ACCESS_TOKEN = var.api_token

# # DOCKERFILE_NAME     = "redis.dockerfile"
# DOCKER_IMAGE_NAME   = fly_app.redis.name
# DOCKER_IMAGE_DIGEST = local.redis_sha1

# ARGS = "--build-arg PASS=12345678"
# }
# working_dir = abspath("${path.module}/build/redis")
# }
# }

# resource "fly_machine" "redis" {
# app    = fly_app.redis.name
# region = var.region
# name   = "${var.project}-${var.environment}-redis"

# cpus     = 1
# memorymb = 256

# image = "registry.fly.io/${fly_app.redis.name}:${local.redis_sha1}"
# # entrypoint = ["sudo mkdir /bitnami/redis && sudo chown 1001:1001 /bitnami/redis &&"]

# lifecycle {
# prevent_destroy = true
# }

# services = [
# {
# "protocol" : "tcp",
# "ports" : [
# {
# port = 6379
# }
# ],
# "internal_port" : 6379,
# }
# ]

# env = {
# REDIS_PASSWORD = var.redis_password
# }

# depends_on = [
# null_resource.redis_builder,
# ]
# }

// ********************* MongoDB *********************

resource "fly_app" "mongodb" {
  name = "${var.project}-${var.environment}-mongodb"
  org  = var.organization
}

resource "fly_machine" "mongodb" {
  app    = fly_app.mongodb.name
  region = var.region
  name   = "${var.project}-${var.environment}-mongodb"

  cpus     = 1
  memorymb = 256

  # image = "registry.fly.io/${fly_app.redis.name}:${local.redis_sha1}"
  image = "bitnami/mongodb:5.0"

  lifecycle {
    prevent_destroy = true
  }

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
    MONGODB_ADVERTISED_HOSTNAME = "mongodb"
    MONGODB_ROOT_USER           = "root"
    MONGODB_ROOT_PASSWORD       = "12345678"
    MONGODB_DATABASE            = "starion-sync"
    MONGODB_REPLICA_SET_MODE    = "primary"
    MONGODB_REPLICA_SET_KEY     = "replicasetkey"
  }

  # depends_on = [
  # null_resource.mongodb_builder,
  # ]
}
