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
            --externalErrorFile)
                external_error_file="$2"
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
            --sheetIndex)
                sheet_index="$2" # from 1
                shift
                ;;
            --sheetName)
                sheet_name="$2"
                shift
                ;;
            --xlsxSheetName)
                xlsx_sheet_name="$2"
                shift
                ;;
            --spreadsheetFile)
                spreadsheet_file="$2"
                shift
                ;;
            --timezone)
                time_zone="$2"
                shift
                ;;
            --accessToken)
                access_token="$2"
                shift
                ;;
            --dataSourceId)
                data_source_id="$2"
                shift
                ;;
            --syncVersion)
                sync_version="$2"
                shift
                ;;
            --s3Endpoint)
                s3_endpoint="$2"
                shift
                ;;
            --s3Host)
                s3_host="$2"
                shift
                ;;
            --s3Region)
                s3_region="$2"
                shift
                ;;
            --s3Bucket)
                s3_bucket="$2"
                shift
                ;;
            --s3AccessKey)
                s3_access_key="$2"
                shift
                ;;
            --s3SecretKey)
                s3_secret_key="$2"
                shift
                ;;
            --s3Ssl)
                s3_ssl="$2"
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

if [[ "$sheet_name" == "testError" ]]; then
    exit 1
fi

###### CONSTANTS #######

EMPTY_HEADER_TOKEN="oYWhr9mRCYjP1ss0suIMbzRJBLH_Uv9UVg61"
EMPTY_VALUE_TOKEN="__StarionSyncNull"
ERROR_VALUE_TOKEN="__Error"
ERROR_VALUE_REGEX="^(#NULL!|#DIV/0!|#VALUE!|#REF!|#NAME\?|#NUM!|#N/A|#ERROR!)$"
DEFAULT_DATE_ERROR_VALUE="2001-01-12T18:13:13.000Z"
ID_COL_NAME="__StarionId"
HASHED_ID_COL_NAME="f_gfbbfabeggejigfgbfhdcdbecifcjhdd"
ROW_NUMBER_COL_NAME="__StarionRowNum"
SHEET_EMPTY_ERROR="1015"
SPREADSHEET_NOT_FOUND_ERROR="1006"
SPREADSHEET_FORBIDDEN_ERROR="1009"
ID_COL_DUPLICATED_ERROR="1201"

###### FUNCTIONS #######

function emit-external-error() {
    local error_code=$1
    local error_message=$2
    info-log "External error: $error_code - $error_message"
    jq -n \
        --arg "code" "$error_code" \
        --arg "msg" "$error_message" \
        '{"code":$code|tonumber,"msg":$msg}' > "$external_error_file"
    exit 1
}

function check-csv-empty() {
    local file=$1
    if [[ -z $(head -n 1 "$file" | awk -F, '{for(i=1;i<=NF;i++) if($i != "") {print $i; exit 0;} exit 0; }') ]]; then
        emit-external-error "$SHEET_EMPTY_ERROR" "Sheet is empty or missing header row"
    fi
}

function download-google-sheets-file() {
    local outfile=$1
    local download_url=$2
    local retry_delay=10 # seconds
    info-log "Downloading file..."
    while true; do
        status_code=$(
            curl \
                -sL \
                -H "Authorization: Bearer $access_token" \
                -H "Accept: text/csv" \
                -o "$outfile" \
                --write-out "%{http_code}" \
                "$download_url"
                # --retry 2 \
        )
        if test "$status_code" -ne 200; then
            info-log "Failed to download file. Status code: $status_code"
            if test "$status_code" -eq 429; then
                sleep "$retry_delay"
            elif test "$status_code" -eq 404; then
                emit-external-error "$SPREADSHEET_NOT_FOUND_ERROR" "Spreadsheet not found"
                exit 1
            elif test "$status_code" -eq 403; then
                emit-external-error "$SPREADSHEET_FORBIDDEN_ERROR" "Missing permission to access spreadsheet"
                exit 1
            fi
        else
            break
        fi
    done
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
export QSV_PREFER_DMY=1
export QSV_LOG_LEVEL=error

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

original_file="$spreadsheet_file"
# download-google-sheets-file "$original_file" "$download_url"

xlsx_header=$(./get-xlsx-header --file "$original_file" --sheetName "$xlsx_sheet_name" --showHeaders)
debug-log "Xlsx header: $xlsx_header"
if [[ -z "$xlsx_header" ]]; then
    emit-external-error "$SHEET_EMPTY_ERROR" "Sheet is empty or missing header row"
else
    # check id col duplicate
    id_col_count=$(echo "$xlsx_header" | tr ',' '\n' | grep -c "^$ID_COL_NAME$") || true
    if [[ "$id_col_count" -gt 1 ]]; then
        emit-external-error "$ID_COL_DUPLICATED_ERROR" "The id column ($ID_COL_NAME) is duplicated"
    fi
fi

### Convert
info-log "Converting file to csv..."
original_csv_file=$TEMP_DIR/original.csv
converted_csv_file=$TEMP_DIR/converted_csv.csv
OGR_XLSX_HEADERS=FORCE OGR_XLSX_FIELD_TYPES=AUTO duckdb :memory: \
    "install spatial; load spatial; COPY (SELECT * FROM st_read('$original_file', layer='$xlsx_sheet_name')) TO '$converted_csv_file' (HEADER FALSE, DELIMITER ',');"

trimmed_ghost_cells="$TEMP_DIR/ghost-cells.csv"
maxColIndex=$(./get-xlsx-header --file "$original_file" --sheetName "$xlsx_sheet_name" --showMaxIndex)
"$QSV" select "1-$((maxColIndex+1))" <(tac "$converted_csv_file" | awk '/[^,]/ {found=1} found' | tac) -o "$trimmed_ghost_cells"
"$QSV" cat rows -n <(echo "$xlsx_header") "$trimmed_ghost_cells" -o "$original_csv_file"

schema_file=$TEMP_DIR/schema.json
"$QSV" schema --dates-whitelist all --enum-threshold 0 --strict-dates --stdout "$original_csv_file" >"$schema_file"

./google-sheets/do-all \
    --csvFile "$original_csv_file" \
    --schemaFile "$schema_file"