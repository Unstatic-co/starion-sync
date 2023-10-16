#!/bin/bash

set -eo pipefail

DEBUG=on

function makeTemp() {
    TEMP_DIR="$(mktemp -d)"
    readonly TEMP_DIR
}

function onFinish() {
    if [[ "$DEBUG" != "on" ]]; then
        rm -rf "$TEMP_DIR"
        :
    fi
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
            --spreadsheetId)
                spreadsheet_id="$2"
                shift
                ;;
            --sheetId)
                sheet_id="$2"
                shift
                ;;
            --accessToken)
                access_token="$2"
                shift
                ;;
            --downloadUrl)
                download_url="$2"
                shift
                ;;
            --dataSourceId)
                data_source_id="$2"
                shift
                ;;
            --idColFile)
                id_col_file="$2"
                shift
                ;;
            --metadataFile)
                metadata_file="$2"
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

debug-log "Arguments: ${*}"
parse-arguments "$@"

###### CONSTANTS #######

EMPTY_HEADER_TOKEN="oYWhr9mRCYjP1ss0suIMbzRJBLH_Uv9UVg61"
readonly EMPTY_HEADER_TOKEN
EMPTY_VALUE_TOKEN="__StarionSyncNull"
readonly EMPTY_VALUE_TOKEN
ID_COL_NAME="__StarionId"
readonly ID_COL_NAME
ROW_NUMBER_COL_NAME="__StarionRowNum"
readonly ROW_NUMBER_COL_NAME

###### FUNCTIONS #######

function download-google-sheets-file() {
    local outfile=$1
    local download_url=$2
    info-log "Downloading file..."
    status_code=$(
        curl \
            -sL \
            -H "Authorization: Bearer $access_token" \
            -H "Accept: text/csv" \
            -o "$outfile" \
            --write-out "%{http_code}" \
            --retry 2 \
            "$download_url"
    )
    if test "$status_code" -ne 200; then
        error-log "Failed to download file. Status code: $status_code"
        exit 1
    fi
}

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
    curl
    "awk"
    "tac"
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

original_file=$TEMP_DIR/original.xlsx
download-google-sheets-file "$original_file" "$download_url"

### Preprocess
info-log "Preprocessing csv file..."
preprocess_file=$TEMP_DIR/preprocess.csv
"$QSV" input "$original_file" -o "$preprocess_file"

# Get headers
info-log "Updating headers metadata..."
input_file="$preprocess_file"
header_result=$(./get-header \
    --file $input_file \
    --printHeaderPositions true \
    --printIdColPosition true
)
while IFS= read -r line; do
  read -r result_key result_value <<< "$line"
    if [[ "$result_key" == "header_pos" ]]; then
        header_pos="$result_value"
    elif [[ "$result_key" == "id_col_pos" ]]; then
        id_col_pos="$result_value"
    fi
done <<< "$header_result"
debug-log "Headers: $header_pos"
debug-log "Id column position: $id_col_pos"

if [[ "$id_col_pos" == "-1" ]]; then
    info-log "Id column not found"
    exit 0
fi

info-log "Removing empty columns..."
input_file="$preprocess_file"
removed_empty_col_file=$TEMP_DIR/removed_empty_col.csv
"$QSV" select "$header_pos" "$input_file" -o "$removed_empty_col_file"

info-log "Removing empty rows at the end..."
input_file="$removed_empty_col_file"
removed_empty_row_file=$TEMP_DIR/removed_empty_row.csv
# awk -F, 'length>NF+1' "$removed_empty_col_file" > "$removed_empty_row_file"
tac "$input_file" | awk -F, 'NF && !/^,*$/ { found=1 } found' | tac > $removed_empty_row_file

info-log "Counting rows..."
input_file="$removed_empty_row_file"
rows_count="$("$QSV" count --no-headers "$input_file")"
debug-log "Rows count: $rows_count"

info-log "Getting id column..."
input_file="$removed_empty_row_file"
"$QSV" select "$ID_COL_NAME" "$input_file" -o "$id_col_file"

info-log "Writting metadata file..."
echo "$rows_count" > "$metadata_file"