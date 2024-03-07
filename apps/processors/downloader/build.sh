#!/bin/bash

set -euo pipefail &>/dev/null

###### ARGUMENTS ######
function parse-arguments() {
    while [[ $# > 0 ]]
    do
        case "$1" in
            --scriptDir)
                SCRIPT_DIR="$2"
                shift
                ;;
            --outDir)
                OUT_DIR="$2"
                shift
                ;;
        esac
        shift
    done
}
parse-arguments "$@"
##############################

SOURCE="${BASH_SOURCE[0]:-$0}"
while [ -L "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
    DIR="$(cd -P "$(dirname -- "$SOURCE")" &>/dev/null && pwd 2>/dev/null)"
    SOURCE="$(readlink -- "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="${DIR}/${SOURCE}" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done

CURRENT_DIR="$(cd -P "$(dirname -- "$SOURCE")" &>/dev/null && pwd 3>/dev/null)"
DIR="$(realpath "$CURRENT_DIR"/..)"
mkdir -p "$OUT_DIR"

declare -a SERVICES=(excel google-sheets)
declare -a COMMON_BINARY_DEPENDENCIES=(generate-id get-csv-header get-xlsx-header find-and-fix-id-col get-and-upload-schema)
declare -A SERVICE_BINARY_DEPENDENCIES=(
    [excel]="get-and-normalize-date-column update-id-column"
    [google-sheets]="get-and-normalize-date-column update-id-column do-all"
)

function buildCommon() {
    echo "Building common dependencies..."
    # golang binaries
    for bin in "${COMMON_BINARY_DEPENDENCIES[@]}"; do
        echo "Building scripts/$bin/main.go..."
        go build -o "$OUT_DIR/$bin" "$SCRIPT_DIR/common/$bin/main.go"
    done
    # shell scripts
    # cp "$SCRIPT_DIR/common/*.sh" "$OUT_DIR/"
    find "$SCRIPT_DIR" -name "*.sh" -exec cp {} "$OUT_DIR" \;
    # cp "$SCRIPT_DIR/*.sh" "$OUT_DIR/"
}

function buildService() {
    service="$1"
    echo "Building service dependencies for $service..."
    mkdir -p "$OUT_DIR/$service"
    declare -a BINARIES
    IFS=" " read -r -a BINARIES <<<"${SERVICE_BINARY_DEPENDENCIES[$service]}"
    # golang binaries
    for bin in "${BINARIES[@]}"; do
        echo "Building scripts/$service/$bin/main.go..."
        go build -o "$OUT_DIR/$service/$bin" "$SCRIPT_DIR/$service/$bin/main.go"
    done
    # shell scripts
    # cp "$SCRIPT_DIR/$service/*.sh" "$OUT_DIR/$service/"
    find "$SCRIPT_DIR/$service" -name "*.sh" -exec cp {} "$OUT_DIR/$service" \;
}

### build dependencies ###
echo "Building dependencies..."

buildCommon
for service in "${SERVICES[@]}"; do
    buildService "$service"
done
##########################

### build web server #####
echo "Building web server..."
go build -tags=jsoniter -o "$OUT_DIR/downloader" .