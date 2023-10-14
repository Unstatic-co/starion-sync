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
  }
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
