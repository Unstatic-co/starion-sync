#!/usr/bin/env bash

set -eouv

is_missing=false
for env in ARTIFACT_REGISTRY_LOCATION ARTIFACT_REGISTRY_REPOSITORY DOCKER_FILE_NAME DOCKER_IMAGE_NAME DOCKER_IMAGE_DIGEST; do
    # Indirect
    value="${!env}"
    if [[ -z "$value" ]]; then
        echo "Missing variable $env"
        is_missing=true
    fi
done
if $is_missing; then
    exit 1
fi

declare -a DOCKER_ARGS=(
    "-t"
    "${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPOSITORY}/${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_DIGEST}"
    --platform
    linux/amd64
    -f "$DOCKER_FILE_NAME"
)

if [[ -n "${ARGS:-}" ]]; then
    declare -a BUILD_ARGS
    IFS=' ' read -r -a BUILD_ARGS <<<"$ARGS"
    DOCKER_ARGS=("${DOCKER_ARGS[@]}" "${BUILD_ARGS[@]}")
fi

export DOCKER_BUILDKIT=1

echo "Building image with args: ${DOCKER_ARGS[@]}"
# Authenticate to Artifact Registry
echo "$GOOGLE_CREDENTIALS" > service-account.json
gcloud auth activate-service-account --key-file=service-account.json
# Get the active account
ACCOUNT=$(gcloud config get-value account)
# Set the account in gcloud config
gcloud config set account $ACCOUNT
# rm service-account.json

# gcloud auth configure-docker "${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev" # not working 
gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin https://${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev
docker build "${DOCKER_ARGS[@]}" .
docker push "${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPOSITORY}/${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_DIGEST}"