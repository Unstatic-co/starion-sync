#!/bin/bash

set -eo pipefail

DEBUG=on

function makeTemp() {
    TEMP_DIR="$(mktemp -d)"
    readonly TEMP_DIR
}

function onFinish() {
    # if [[ "$DEBUG" != "on" ]]; then
        # rm -rf "$TEMP_DIR"
        # :
    # fi
    rm -rf "$TEMP_DIR"
    echo 'Done! Exiting'
}
trap onFinish EXIT

###### LOGGING ######
function debug-log() {
    if [ "$DEBUG" == "on" ]; then
        printf "%s\n" "$1"
    fi
}
function info-log() {
    printf "%s\n" "$1"
}
function error-log() {
    printf "%s\n" "$1" >&2
}
function trap-log() {
    while IFS='' read -r line; do
        error-log "$line"
    done
}

###### ARGUMENTS ######
function parse-arguments() {
    while [[ $# > 0 ]]
    do
        case "$1" in
            --driveId)
                drive_id="$2"
                shift
                ;;
            --workbookId)
                workbook_id="$2"
                shift
                ;;
            --worksheetId)
                worksheet_id="$2"
                shift
                ;;
            --worksheetName)
                worksheet_name="$2"
                shift
                ;;
            --accessToken)
                access_token="$2"
                shift
                ;;
            --debug)
                DEBUG="$2"
                shift
                ;;
            --help|*)
                # echo "Usage:"
                # echo "    --source-file \"value\""
                # echo "    --dest-file \"value\""
                # echo "    --help"
                # exit 1
                # ;;
        esac
        shift
    done
}
# debug-log "Arguments: ${*}"
parse-arguments "$@"

######### MAIN #########

makeTemp

### Prepare

# sed
if [[ "$(uname -a)" =~ Darwin ]]; then
    SED="gsed"
else
    SED="sed"
fi
readonly SED

# qsv
if [[ -n "$LOCAL" ]]; then
    QSV="$HOME/projects/qsv/target/release/qsv"
elif command -v qsvnp &>/dev/null; then
    QSV=qsvnp
else
    QSV="qsv"
fi
readonly QSV

# check missing commands
missing_command=0
declare -r -a REQUIRED_COMMANDS=(
    "$QSV"
    # jq
    curl
    # parallel
    # xxd
    "$SED"
)
for command in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$command" &>/dev/null; then
        missing_command=1
        echo "Missing command $command" >&2
    fi
done
if [[ "$missing_command" == "1" ]]; then
    exit 1
fi

### Download

# original_file=$TEMP_DIR/original.xlsx
original_file=temp/original.xlsx
if [[ -z "$drive_id" ]]; then
    download_url="https://graph.microsoft.com/v1.0/me/drive/items/$workbook_id/content"
else
    download_url="https://graph.microsoft.com/v1.0/drives/$drive_id/items/$workbook_id/content"
fi
info-log "Downloading file..."
status_code=$(
    curl \
        -sL \
        -H "Authorization: Bearer $access_token" \
        -o "$original_file" \
        --write-out "%{http_code}" \
        "$download_url"
)
if test "$status_code" -ne 200; then
    error-log "Failed to download file. Status code: $status_code"
    exit 1
fi

### Convert
info-log "Converting file to csv..."
# original_csv_file=$TEMP_DIR/original.csv
original_csv_file=temp/original.csv
"$QSV" excel \
    --quiet \
    --flexible \
    --trim \
    --sheet "$worksheet_name" \
    --output "$original_csv_file" \
    "$original_file"

### Preprocess
info-log "Preprocessing csv file..."
# preprocess_file=$TEMP_DIR/preprocess.csv
preprocess_file=temp/preprocess.csv

"$QSV" input "$original_csv_file" -o "$preprocess_file"

rows_number="$("$QSV" count "$original_csv_file")"

# dedup_header_file=$TEMP_DIR/dedup-header-normalize.csv
dedup_header_file=temp/dedup-header-normalize.csv

"$QSV" safenames "$preprocess_file" -o "$dedup_header_file"

original_headers="$("$QSV" slice -s 0 -e 1 -n "$preprocess_file")"
placeholder_headers="$("$QSV" slice -s 0 -e 1 -n "$dedup_header_file")"

readarray -t -d $'\n' date_headers < <(
    "$QSV" schema --dates-whitelist all --enum-threshold 0 --strict-dates --stdout "$dedup_header_file" |
        jq -r '[.properties | to_entries[] | select(.value.format == "date-time" or .value.format == "date")] | map(.key)[]'
)
debug-log "Date headers: ${date_headers[*]}"

declare -a safe_header_maps
IFS= readarray -t -d '' safe_header_maps < <("./scripts/get-csv-header" -file "$dedup_header_file" -print0 -replaceEmpty "$EMPTY_HEADER_TOKEN")
debug-log "Safe header maps: ${safe_header_maps[*]}"
declare -a date_header_idx
declare -a date_header_str
for col in "${date_headers[@]}"; do
    for idx in "${!safe_header_maps[@]}"; do
        if [[ "$col" = "${safe_header_maps[$idx]}" ]]; then
            date_header_idx+=("$((idx + 1))")
            date_header_str+=("$col")
            break
        fi
    done
done
date_col_idxs="$(
    export IFS=,
    echo -n "${date_header_idx[*]}"
)"
joined_date_header_strs="$(
    export IFS=,
    echo -n "${date_header_str[*]}"
)"
debug-log "Adjust date format for columns [$joined_date_header_strs], with index [$date_col_idxs]"

