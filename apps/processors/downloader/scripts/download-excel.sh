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
            --sessionId)
                session_id="$2"
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
            --timezone)
                time_zone="$2"
                shift
                ;;
            --s3Url)
                s3_url="$2"
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

function get-excel-session() {
    info-log "Creating excel session..."
    if [[ -z "$drive_id" ]]; then
        local url="https://graph.microsoft.com/v1.0/me/drive/items/$workbook_id//workbook/createSession"
    else
        local url="https://graph.microsoft.com/v1.0/drives/$drive_id/items/$workbook_id/workbook/createSession"
    fi
    local response_file="$TEMP_DIR/get_session_response.json"
    status_code=$(
        curl \
            -s \
            -X "POST" \
            -H "Authorization: Bearer $access_token" \
            -H "Content-Length: 0" \
            -H "Content-Type: application/json" \
            --data "{\"id\":\"$workbook_id\",\"persistChanges\":true}" \
            -o "$response_file" \
            --write-out "%{http_code}" \
            "$url"
    )
    if test "$status_code" -ne 201; then
        error-log "Failed to create session. Status code: $status_code"
        exit 1
    fi
    session_id=$(cat "$response_file" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
}

function download-excel-file() {
    local outfile=$1
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
            -H "workbook-session-id: $session_id" \
            -o "$outfile" \
            --write-out "%{http_code}" \
            "$download_url"
    )
    if test "$status_code" -ne 200; then
        error-log "Failed to download file. Status code: $status_code"
        exit 1
    fi
}

function close-excel-session() {
    info-log "Closing excel session..."
    if [[ -z "$drive_id" ]]; then
        local url="https://graph.microsoft.com/v1.0/me/drive/items/$workbook_id//workbook/closeSession"
    else
        local url="https://graph.microsoft.com/v1.0/drives/$drive_id/items/$workbook_id/workbook/closeSession"
    fi
    local response_file="$TEMP_DIR/close_session_response.json"
    status_code=$(
        curl \
            -s \
            -X "POST" \
            -H "Authorization: Bearer $access_token" \
            -H "workbook-session-id: $session_id" \
            -H "Content-Length: 0" \
            -o "$response_file" \
            --write-out "%{http_code}" \
            "$url"
    )
    if test "$status_code" -ne 204; then
        error-log "Failed to close session. Status code: $status_code"
        exit 1
    fi
    session_id=$(cat "$response_file" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
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

if [[ -z "$session_id" ]]; then
    get-excel-session
fi

original_file=$TEMP_DIR/original.xlsx
download-excel-file "$original_file"

### Convert
info-log "Converting file to csv..."
original_csv_file=$TEMP_DIR/original.csv
"$QSV" excel \
    --quiet \
    --flexible \
    --trim \
    --sheet "$worksheet_name" \
    --output "$original_csv_file" \
    "$original_file"

### Preprocess
info-log "Preprocessing csv file..."
preprocess_file=$TEMP_DIR/preprocess.csv

"$QSV" input "$original_csv_file" -o "$preprocess_file"
input_file="$preprocess_file"

rows_number="$("$QSV" count "$original_csv_file")"

dedup_header_file=$TEMP_DIR/dedup-header-normalize.csv

"$QSV" safenames "$preprocess_file" -o "$dedup_header_file"

original_headers="$("$QSV" slice -s 0 -e 1 -n "$preprocess_file")"
placeholder_headers="$("$QSV" slice -s 0 -e 1 -n "$dedup_header_file")"

## Preprocess: Normalize date headers

readarray -t -d $'\n' date_headers < <(
    "$QSV" schema --dates-whitelist all --enum-threshold 0 --strict-dates --stdout "$dedup_header_file" |
        jq -r '[.properties | to_entries[] | select(.value.format == "date-time" or .value.format == "date")] | map(.key)[]'
)
debug-log "Detected date headers: ${date_headers[*]}"

declare -a safe_header_maps
IFS= readarray -t -d '' safe_header_maps < <("./get-csv-header" -file "$dedup_header_file" -print0 -replaceEmpty "$EMPTY_HEADER_TOKEN")
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

info-log "Adjust date format for columns [$joined_date_header_strs], with index [$date_col_idxs]"

normalized_date_file="$TEMP_DIR/normalized_date.csv"
if [[ $(("${#date_header_idx[@]}")) -gt 0 ]]; then
    info-log "Normalizing date columns..."
    temp_updated_dates_file=$TEMP_DIR/updated_dates.csv
    cat <(echo "$joined_date_header_strs") <(
        "./excel/get-and-normalize-date-column" \
            --driveId "$drive_id" \
            --workbookId "$workbook_id" \
            --worksheetId "$worksheet_id" \
            --accessToken "$access_token" \
            --sessionId "$session_id" \
            --colIndexes "$date_col_idxs" \
            --rowNumber "$rows_number" \
            --replaceEmpty "$EMPTY_VALUE_TOKEN" \
            --timezone "$time_zone"
    ) >"$temp_updated_dates_file"

    "$QSV" cat columns -p <("$QSV" select "!${date_col_idxs}" "$dedup_header_file") "$temp_updated_dates_file" |
        "$QSV" select "$placeholder_headers" -o "$normalized_date_file"
    
    "$SED" -i "s/$EMPTY_VALUE_TOKEN//g" $normalized_date_file # remove empty value token

    "$QSV" cat rows -n <(echo "$original_headers") <("$QSV" behead "$normalized_date_file") -o "$normalized_date_file"
    input_file="$normalized_date_file"
fi
## End ##

## Preprocess: Get primary key column index
declare -a initial_headers
IFS= readarray -t -d '' initial_headers < <("./get-csv-header" -file "$input_file" -print0 -replaceEmpty "$EMPTY_HEADER_TOKEN")

export id_col_colnum=-1
export missing_id_col=true
for col in "${!initial_headers[@]}"; do
    if [[ ${initial_headers[$col]} == "$ID_COL_NAME" ]]; then
        id_col_colnum=$((col + 1))
        missing_id_col=false
        break
    fi
done

debug-log "ID col colnum: $id_col_colnum"
readonly missing_id_col
## End ##

## Preprocess: Trim columns with empty headers
declare -a SELECTING_COLS=()

for idx in "${!initial_headers[@]}"; do
    colname="${initial_headers[$idx]}"
    if [[ ! "$colname" == "$EMPTY_HEADER_TOKEN" ]]; then
        SELECTING_COLS+=("$((idx + 1))")
    fi
done
SELECTING_COLS_STR="$(
    IFS=,
    echo "${SELECTING_COLS[*]}"
)"
debug-log "Selected columns: $SELECTING_COLS_STR"

removed_empty_header_file="$TEMP_DIR/removed_empty_header.csv"
"$QSV" select "$SELECTING_COLS_STR" "$input_file" -o "$removed_empty_header_file"
input_file="$removed_empty_header_file"
## End ##

## Preprocess: Normalize headers
# Must get header again to account for removed rows
declare -a normalized_headers
IFS= readarray -t -d '' normalized_headers < <("./get-csv-header" -file "$input_file" -print0 -dedupe)
normalized_header_file=$TEMP_DIR/normalized_header.csv
cat <(
    IFS=,
    echo "${normalized_headers[*]}"
) <("$QSV" behead "$input_file") >"$normalized_header_file"
input_file="$normalized_header_file"
normalized_header_file_2=$TEMP_DIR/normalized_header_2.csv

if ((id_col_colnum == -1)); then
    # add header for id column
    # Using table with row number to add id column, keeping input table intact
    "$QSV" cat columns --pad "$input_file" <(echo "$ID_COL_NAME") -o "$normalized_header_file_2"
    id_col_colnum=$((${#initial_headers[@]} + 1))
    normalized_headers+=("$ID_COL_NAME")
    info-log "New id column index: ${id_col_colnum}"
else
    # If has id column => move to end to accurately join using "$QSV"
    "$QSV" cat columns <("$QSV" select "!$ID_COL_NAME" "$input_file") <("$QSV" select "$ID_COL_NAME" "$input_file") -o "$normalized_header_file_2"
fi
input_file="$normalized_header_file_2"
## End ##

## Preprocess: Add missing primary key
# Append row number
table_with_row_number="$TEMP_DIR/with_row_number.csv"
record_counts=$("$QSV" count "$input_file")
debug-log "Creating table with row number..."
"$QSV" cat columns "$input_file" <(
    echo "$ROW_NUMBER_COL_NAME"
    seq 2 $((record_counts + 1))
) --output "$table_with_row_number"

# Search missing id rows
table_missing_id_rows="$TEMP_DIR/with_missing_id_rows.csv"
"$QSV" search -s "$ID_COL_NAME" '^$' "$table_with_row_number" -o "$table_missing_id_rows" || true # Suppress exit code 1 when no match found
missing_counts="$("$QSV" count "$table_missing_id_rows")"
info-log "Number of rows missing primary keys: $missing_counts"

if ((missing_counts == 0)); then
    appended_id_file="$input_file"
else
    # Add missing ids
    table_id_for_missing_rows="$TEMP_DIR/id_for_missing_rows.csv"
    "$QSV" cat columns \
        <("$QSV" select "!${ID_COL_NAME}" "$table_missing_id_rows") \
        <(./generate-id --columnName "$ID_COL_NAME" --n "$missing_counts") |
        "$QSV" select "${ID_COL_NAME},${ROW_NUMBER_COL_NAME}" --output "$table_id_for_missing_rows"
    
    info-log "Adding missing primary keys..."
    ./excel/update-id-column \
        --driveId "$drive_id" \
        --workbookId "$workbook_id" \
        --worksheetId "$worksheet_id" \
        --accessToken "$access_token" \
        --sessionId "$session_id" \
        --idColIndex "$id_col_colnum" \
        --idsFile "$table_id_for_missing_rows" \
        --includeHeader "$missing_id_col"

    appended_id_file="$TEMP_DIR/appended_id.csv"

    "$QSV" cat rows \
        <("$QSV" search -s "$ID_COL_NAME" -v "^$" "$table_with_row_number" | "$QSV" select "!${ROW_NUMBER_COL_NAME}") \
        <("$QSV" join "$ROW_NUMBER_COL_NAME" "$table_with_row_number" $ROW_NUMBER_COL_NAME "$table_id_for_missing_rows" |
            "$QSV" select "!${ID_COL_NAME}[0],${ROW_NUMBER_COL_NAME},${ROW_NUMBER_COL_NAME}[1]") --output "$appended_id_file"
fi
## End ##

## Preprocess: Encode header
# encode header to `_${hex}` (underscore + hexadecimal encoding of col name) format to easily querying in DB
info-log "Encoding header..."
header_encoded_file="$TEMP_DIR/header-endcoded.csv"
new_headers="$("./get-csv-header" -file "$appended_id_file" -encode -sep ,)"
echo "$new_headers" >"$header_encoded_file"
"$QSV" behead "$appended_id_file" >>"$header_encoded_file"
## End ##

### Schema
info-log "Inferring schema..."
detected_schema_file="$TEMP_DIR/schema.json"
"$QSV" schema --dates-whitelist all --enum-threshold 5 --strict-dates --stdout "$appended_id_file" >"$detected_schema_file"
# upload
info-log "Uploading schema..."
./excel/get-and-upload-schema \
    --schemaFile "$detected_schema_file" \
    --s3Url "$s3_url" \
    --s3Region "$s3_region" \
    --s3Bucket "$s3_bucket" \
    --s3AccessKey "$s3_access_key" \
    --s3SecretKey "$s3_secret_key" \
    --dataSourceId "$data_source_id" \
    --syncVersion "$sync_version"

### Convert JSON
info-log "Converting json..."
json_file="$TEMP_DIR/data.json"
"$QSV" tojsonl "$header_encoded_file" --output "$json_file"

### Convert parquet
info-log "Converting parquet..."
s3_location="$s3_url/$s3_bucket/data/$data_source_id-$sync_version.parquet"
debug-log "S3 location: $s3_location"
clickhouse local -q "
    SET s3_truncate_on_insert = 1;
    INSERT INTO FUNCTION
        s3(
            '$s3_location',
            '$s3_access_key',
            '$s3_secret_key',
            'Parquet'
        )
    SELECT * FROM file('$json_file', 'JSONEachRow')
"

### Upload JSON
if [ "$DEBUG" == "on" ]; then
    info-log "Uploading json..."
    s3_location="$s3_url/$s3_bucket/data/$data_source_id-$sync_version.json"
    clickhouse local -q "
        SET s3_truncate_on_insert = 1;
        INSERT INTO FUNCTION
            s3(
                '$s3_location',
                '$s3_access_key',
                '$s3_secret_key',
                'JSONEachRow'
            )
        SELECT * FROM file('$json_file', 'JSONEachRow')
    "
fi

close-excel-session || true
