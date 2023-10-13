#!/bin/bash

set -eo pipefail

is_missing=false
for env in DOCKER_FILE DOCKER_IMAGE_NAME DOCKER_IMAGE_DIGEST; do
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
    registry.fly.io/"$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_DIGEST"
    --platform
    linux/amd64
    -f "$DOCKER_FILE"
)

if [[ -n "${ARGS:-}" ]]; then
    declare -a BUILD_ARGS
    IFS=' ' read -r -a BUILD_ARGS <<<"$ARGS"
    DOCKER_ARGS=("${DOCKER_ARGS[@]}" "${BUILD_ARGS[@]}")
fi

# export DOCKER_BUILDKIT=1
flyctl auth docker --access-token "$FLY_ACCESS_TOKEN"
docker build "${DOCKER_ARGS[@]}" .
docker push registry.fly.io/"$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_DIGEST"