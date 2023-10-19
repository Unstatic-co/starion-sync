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
            --sheetName)
                sheet_name="$2"
                shift
                ;;
            --downloadUrl)
                download_url="$2"
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

###### CONSTANTS #######

EMPTY_HEADER_TOKEN="oYWhr9mRCYjP1ss0suIMbzRJBLH_Uv9UVg61"
EMPTY_VALUE_TOKEN="__StarionSyncNull"
ERROR_VALUE_TOKEN="__Error"
ERROR_VALUE_REGEX="^(#NULL!|#DIV/0!|#VALUE!|#REF!|#NAME\?|#NUM!|#N/A|#ERROR!)$"
ID_COL_NAME="__StarionId"
ROW_NUMBER_COL_NAME="__StarionRowNum"
SHEET_EMPTY_ERROR="1015"
SPREADSHEET_NOT_FOUND_ERROR="1006"
SPREADSHEET_FORBIDDEN_ERROR="1009"

###### FUNCTIONS #######

function write-external-error() {
    local error_code=$1
    local error_message=$2
    info-log "External error: $error_code - $error_message"
    jq -n \
        --arg "code" "$error_code" \
        --arg "msg" "$error_message" \
        '{"code":$code|tonumber,"msg":$msg}' > "$external_error_file"
    exit 0
}

function check-csv-empty() {
    local file=$1
    if [[ -z $(head -n 1 "$file" | awk -F, '{for(i=1;i<=NF;i++) if($i != "") {print $i; exit 0;} exit 0; }') ]]; then
        write-external-error "$SHEET_EMPTY_ERROR" "Sheet is empty or missing header row"
    fi
}

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
        if test "$status_code" -eq 404; then
            write-external-error "$SPREADSHEET_NOT_FOUND_ERROR" "Spreadsheet not found"
        elif test "$status_code" -eq 403; then
            write-external-error "$SPREADSHEET_FORBIDDEN_ERROR" "Missing permission to access spreadsheet"
        fi
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

original_file=$TEMP_DIR/original.xlsx
download-google-sheets-file "$original_file" "$download_url"

xlsx_header=$(./get-xlsx-header --file "$original_file" --showHeaders)
debug-log "Xlsx header: $xlsx_header"
if [[ -z "$xlsx_header" ]]; then
    write-external-error "$WORKSHEET_EMPTY_ERROR" "Sheet is empty or missing header row"
fi

### Convert
info-log "Converting file to csv..."
original_csv_file=$TEMP_DIR/original.csv
converted_csv_file=$TEMP_DIR/converted_csv.csv
OGR_XLSX_HEADERS=FORCE OGR_XLSX_FIELD_TYPES=AUTO duckdb :memory: \
    "load spatial; COPY (SELECT * FROM st_read('$original_file', layer='$sheet_name')) TO '$converted_csv_file' (HEADER FALSE, DELIMITER ',');"

trimmed_ghost_cells="$TEMP_DIR/ghost-cells.csv"
maxColIndex=$(./get-xlsx-header --file "$original_file" --showMaxIndex)
"$QSV" select "1-$((maxColIndex+1))" <(tac "$converted_csv_file" | awk '/[^,]/ {found=1} found' | tac) -o "$trimmed_ghost_cells"
"$QSV" cat rows -n <(echo "$xlsx_header") "$trimmed_ghost_cells" -o "$original_csv_file"

# check-csv-empty "$original_csv_file"``

### Preprocess
info-log "Preprocessing csv file..."
preprocess_file=$TEMP_DIR/preprocess.csv

"$QSV" input --trim-headers --trim-fields "$original_csv_file" -o "$preprocess_file"
input_file="$preprocess_file"

rows_number="$("$QSV" count "$original_csv_file")"
debug-log "Number of rows: $rows_number"

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
        "./google-sheets/get-and-normalize-date-column" \
            --spreadsheetId "$spreadsheet_id" \
            --sheetId "$sheet_id" \
            --sheetName "$sheet_name" \
            --timezone "$time_zone" \
            --accessToken "$access_token" \
            --colIndexes "$date_col_idxs" \
            --rowNumber "$rows_number" \
            --replaceEmpty "$ERROR_VALUE_TOKEN"
    ) >"$temp_updated_dates_file"

    "$QSV" cat columns -p <("$QSV" select "!${date_col_idxs}" "$dedup_header_file") "$temp_updated_dates_file" |
        "$QSV" select "$placeholder_headers" -o "$normalized_date_file"
    
    # "$SED" -i "s/$EMPTY_VALUE_TOKEN/$ERROR_VALUE_TOKEN/g" $normalized_date_file # remove empty value token

    behead_file="$TEMP_DIR/behead.csv"
    "$QSV" behead -o "$behead_file" "$normalized_date_file"

    "$QSV" cat rows -n <(echo "$original_headers") "$behead_file" -o "$normalized_date_file"
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
id_with_row_number="$TEMP_DIR/id_with_row_number.csv"
debug-log "Creating id with row number..."
"$QSV" select "${ID_COL_NAME},${ROW_NUMBER_COL_NAME}" "$table_with_row_number" -o "$id_with_row_number"

# Find and fix id column
table_fixed_id_rows="$TEMP_DIR/fixed_id_rows.csv"
table_new_id_rows="$TEMP_DIR/new_id_rows.csv"
./find-and-fix-id-col \
    --inFile "$id_with_row_number" \
    --outFile "$table_fixed_id_rows" \
    --fullOutFile "$table_new_id_rows" \
    --idColName "$ID_COL_NAME" \
    --rowNumColName "$ROW_NUMBER_COL_NAME"
fixed_id_count="$("$QSV" count "$table_fixed_id_rows")"
info-log "Number of rows have invalid id: $fixed_id_count"

if ((fixed_id_count == 0)); then
    appended_id_file="$input_file"
else
    info-log "Fixing primary keys..."
    ./google-sheets/update-id-column \
        --spreadsheetId "$spreadsheet_id" \
        --sheetId "$sheet_id" \
        --sheetName "$sheet_name" \
        --accessToken "$access_token" \
        --idColIndex "$id_col_colnum" \
        --idsFile "$table_fixed_id_rows" \
        --includeHeader "$missing_id_col"
    info-log "Fixed primary keys"

    appended_id_file="$TEMP_DIR/appended_id.csv"
    "$QSV" cat columns -p \
        <("$QSV" select "!${ID_COL_NAME}" "$input_file") \
        <("$QSV" select "${ID_COL_NAME}" "$table_new_id_rows") \
        -o "$appended_id_file"
    # "$QSV" \
        # select "!${ID_COL_NAME}[0],${ROW_NUMBER_COL_NAME},${ROW_NUMBER_COL_NAME}[1]" \
        # <("$QSV" join "$ROW_NUMBER_COL_NAME" "$table_with_row_number" $ROW_NUMBER_COL_NAME "$table_new_id_rows") \
        # --output "$appended_id_file"
fi
# ## End ##

## Preprocess: Replace error values & Encode header
# encode header to `_${hex}` (underscore + hexadecimal encoding of col name) format to easily querying in DB
info-log "Replacing error values & Encoding header..."
input_file=$appended_id_file

replaced_error_file="$TEMP_DIR/replaced_error.csv"
echo "$(./get-csv-header -file "$input_file" -sep ,)" >"$replaced_error_file"
"$QSV" behead <("$QSV" replace -s "!$ID_COL_NAME" "$ERROR_VALUE_REGEX" "$ERROR_VALUE_TOKEN" "$input_file") >>"$replaced_error_file"

header_encoded_file="$TEMP_DIR/header-endcoded.csv"
new_headers="$("./get-csv-header" -file "$input_file" -encode -sep ,)"
echo "$new_headers" >"$header_encoded_file"
"$QSV" behead "$replaced_error_file" >>"$header_encoded_file"
## End ##

### Schema
info-log "Inferring schema..."
detected_schema_file="$TEMP_DIR/schema.json"
"$QSV" schema --dates-whitelist all --enum-threshold 5 --strict-dates --stdout "$replaced_error_file" >"$detected_schema_file"
# upload
info-log "Uploading schema..."
duckdb_schema_file="$TEMP_DIR/null_become_string_fields"
./excel/get-and-upload-schema \
    --schemaFile "$detected_schema_file" \
    --s3Endpoint "$s3_endpoint" \
    --s3Region "$s3_region" \
    --s3Bucket "$s3_bucket" \
    --s3AccessKey "$s3_access_key" \
    --s3SecretKey "$s3_secret_key" \
    --dataSourceId "$data_source_id" \
    --syncVersion "$sync_version" \
    --saveDuckdbTableSchema "$duckdb_schema_file"

# ### Convert JSON
# info-log "Converting json..."
# json_file="$TEMP_DIR/data.json"
# "$QSV" tojsonl "$header_encoded_file" --output "$json_file"

# ### Convert data
duckdb_schema="$(cat $duckdb_schema_file)"
s3_file_path="data/$data_source_id-$sync_version.parquet"
s3_json_file_path="data/$data_source_id-$sync_version.json"
duckdb_convert_data_query="
    LOAD httpfs;
    SET s3_region='$s3_region';
    SET s3_access_key_id='$s3_access_key';
    SET s3_secret_access_key='$s3_secret_key';
    SET s3_url_style='path';
    SET s3_use_ssl=false;
    SET s3_endpoint='$s3_host';
    COPY (SELECT * FROM read_csv('$header_encoded_file', all_varchar=TRUE, auto_detect=TRUE, header=TRUE, quote='\"', escape='\"')) TO 's3://$s3_bucket/$s3_file_path' (FORMAT 'parquet');
"
if [[ "$debug" == "on" ]]; then
    duckdb_convert_data_query += "COPY t TO 's3://$s3_bucket/$s3_json_file_path' (FORMAT 'JSON');"
fi
duckdb :memory: "$duckdb_convert_data_query"