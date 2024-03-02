terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0.23"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.1.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.4.1"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.30.0"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.16.1"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.8.0"
    }

    kubectl = {
      source  = "gavinbunney/kubectl"
      version = ">= 1.7.0"
    }
  }

  backend "gcs" {}
}

provider "fly" {
  fly_api_token = var.fly_api_token
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

provider "cloudflare" {
  api_token = var.cf_api_token
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

provider "digitalocean" {
  token = local.is_production ? var.do_token : null
}

data "digitalocean_kubernetes_cluster" "default_cluster" {
  count = local.is_production ? 1 : 0
  name  = var.cluster_name
}

locals {
  doks_config         = local.is_production ? data.digitalocean_kubernetes_cluster.default_cluster[0].kube_config[0].raw_config : null
  doks_endpoint       = local.is_production ? data.digitalocean_kubernetes_cluster.default_cluster[0].endpoint : var.K3S_ENDPOINT
  doks_token          = local.is_production ? data.digitalocean_kubernetes_cluster.default_cluster[0].kube_config[0].token : null
  doks_ca_certificate = local.is_production ? data.digitalocean_kubernetes_cluster.default_cluster[0].kube_config[0].cluster_ca_certificate : var.K3S_CA_CERTIFICATE
  client_certificate  = local.is_production ? data.digitalocean_kubernetes_cluster.default_cluster[0].kube_config[0].client_certificate : var.K3S_CLIENT_CERTIFICATE
  client_key          = local.is_production ? data.digitalocean_kubernetes_cluster.default_cluster[0].kube_config[0].client_key : var.K3S_CLIENT_KEY
}

provider "kubernetes" {
  host  = local.doks_endpoint
  token = local.doks_token
  client_certificate = base64decode(
    local.client_certificate
  )
  client_key = base64decode(
    local.client_key
  )
  cluster_ca_certificate = base64decode(
    local.doks_ca_certificate
  )
}
provider "kubectl" {
  host = local.doks_endpoint

  cluster_ca_certificate = base64decode(
    local.doks_ca_certificate
  )

  token = local.doks_token

  client_certificate = base64decode(
    local.client_certificate
  )
  client_key = base64decode(
    local.client_key
  )

  load_config_file = false
}

provider "helm" {
  kubernetes {
    host  = local.doks_endpoint
    token = local.doks_token

    client_certificate = base64decode(
      local.client_certificate
    )
    client_key = base64decode(
      local.client_key
    )

    cluster_ca_certificate = base64decode(
      local.doks_ca_certificate
    )
  }
}

