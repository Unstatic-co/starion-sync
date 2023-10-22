resource "digitalocean_database_cluster" "redis" {
  count = local.redis_count

  project_id = digitalocean_project.starion_sync[0].id
  region     = var.do_region

  name            = "redis"
  engine          = "redis"
  version         = "7"
  size            = "db-s-1vcpu-1gb"
  eviction_policy = "noeviction"
  node_count      = 1
}

resource "digitalocean_database_cluster" "mongodb" {
  count = local.mongodb_count

  project_id = digitalocean_project.starion_sync[0].id
  region     = var.do_region

  name            = "mongodb"
  engine          = "mongodb"
  version         = "6"
  size            = "db-s-1vcpu-1gb"
  eviction_policy = "noeviction"
  node_count      = 1
}

resource "digitalocean_database_cluster" "postgres" {
  count = local.postgres_count

  project_id = digitalocean_project.starion_sync[0].id
  region     = var.do_region

  name            = "postgres"
  engine          = "postgresql"
  version         = "15"
  size            = "db-s-1vcpu-1gb"
  eviction_policy = "noeviction"
  node_count      = 1
}
