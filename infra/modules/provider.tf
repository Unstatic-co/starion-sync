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
