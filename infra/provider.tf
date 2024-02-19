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
  token = var.do_token
}

data "digitalocean_kubernetes_cluster" "default_cluster" {
  name = var.cluster_name
}

locals {
  doks_config         = data.digitalocean_kubernetes_cluster.default_cluster.kube_config[0].raw_config
  doks_endpoint       = data.digitalocean_kubernetes_cluster.default_cluster.endpoint
  doks_token          = data.digitalocean_kubernetes_cluster.default_cluster.kube_config[0].token
  doks_ca_certificate = data.digitalocean_kubernetes_cluster.default_cluster.kube_config[0].cluster_ca_certificate
}

provider "kubernetes" {
  host  = local.doks_endpoint
  token = local.doks_token
  cluster_ca_certificate = base64decode(
    local.doks_ca_certificate
  )
}
provider "kubectl" {
  host = local.doks_endpoint
  cluster_ca_certificate = base64decode(
    local.doks_ca_certificate
  )
  token            = local.doks_token
  load_config_file = false
}

provider "helm" {
  kubernetes {
    host  = local.doks_endpoint
    token = local.doks_token
    cluster_ca_certificate = base64decode(
      local.doks_ca_certificate
    )
  }
}

