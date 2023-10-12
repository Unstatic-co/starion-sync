terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "0.0.23"
    }
  }
}

provider "fly" {
  fly_api_token = var.fly_api_token
}
