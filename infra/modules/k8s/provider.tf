terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.8.0"
    }

    kubectl = {
      source  = "gavinbunney/kubectl"
      version = ">= 1.7.0"
    }
  }
}