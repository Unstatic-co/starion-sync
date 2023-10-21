# *************************************** DEPLOY IMAGE ***************************************

data "google_container_registry_image" "starion_sync_deploy_image" {
  name = "starion-sync-deploy-image"
}

resource "google_cloudbuild_trigger" "starion_sync_deploy_image_builder" {
  name     = "starion-sync-deploy-image"
  location = var.gcp_region

  build {
    step {
      name = "gcr.io/cloud-builders/gcloud"
      dir  = "infra/cloudbuild"
      args = ["builds", "submit", "--tag", "$${_IMAGE_URL}"]
    }
    substitutions = {
      _IMAGE_URL = data.google_container_registry_image.starion_sync_deploy_image.image_url
    }
    timeout = "3000s"
    options {
      # substitution_option = "MUST_MATCH"
      logging = "CLOUD_LOGGING_ONLY"
    }
  }

  github {
    owner = var.github_owner
    name  = var.github_repo_name
    pull_request {
      branch = var.environment
    }
  }

  included_files = [
    "infra/cloudbuild/Dockerfile",
  ]
}

# *************************************** DEPLOY TRIGGER ***************************************

data "google_service_account" "deploy_service_account" {
  account_id = var.gcp_deploy_service_account_id
  # project    = var.gcp_project
}

resource "google_cloudbuild_trigger" "starion_sync_deploy" {
  name     = "${var.project}-deploy"
  location = var.gcp_region
  filename = "infra/cloudbuild/stagging.cloudbuild.yml"

  // If this is set on a build, it will become pending when it is run, 
  // and will need to be explicitly approved to start.
  approval_config {
    approval_required = false
  }

  substitutions = {
    _SECRET_PREFIX    = var.gcp_secret_prefix
    _DEPLOY_IMAGE_URL = "${data.google_container_registry_image.starion_sync_deploy_image.image_url}"
  }

  github {
    owner = var.github_owner
    name  = var.github_repo_name
    # pull_request {
    # branch = "${var.environment}|test-build-stagging"
    # }
    push {
      branch = "${var.environment}|test-build-stagging"
    }
  }

  service_account = "projects/${data.google_service_account.deploy_service_account.project}/serviceAccounts/${data.google_service_account.deploy_service_account.email}"
}
