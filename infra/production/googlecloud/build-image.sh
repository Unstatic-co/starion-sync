#!/bin/bash

set -eo pipefail

is_missing=false
for env in PROJECT IMAGE_NAME WORKDIR; do
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

gcloud builds submit --tag "gcr.io/$PROJECT/$IMAGE_NAME" "$WORKDIR"