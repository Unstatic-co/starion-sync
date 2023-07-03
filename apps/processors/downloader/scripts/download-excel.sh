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

original_file=$TEMP_DIR/original.xlsx
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

info-log "Adjust date format for columns [$joined_date_header_strs], with index [$date_col_idxs]"

normalized_date_file="$TEMP_DIR/normalized_date.csv"
if [[ $(("${#date_header_idx[@]}")) -gt 0 ]]; then
    temp_updated_dates_file=$TEMP_DIR/updated_dates.csv
    cat <(echo "$joined_date_header_strs") <(
        "./scripts/get-and-normalize-date-column" \
            --driveId "$drive_id" \
            --workbookId "$workbook_id" \
            --worksheetId "$worksheet_id" \
            --accessToken "$access_token" \
            --colIndexes "$date_col_idxs" \
            --rowNumber "$rows_number" \
            --replaceEmpty "$EMPTY_VALUE_TOKEN"
    ) >"$temp_updated_dates_file"

    "$QSV" cat columns -p <("$QSV" select "!${date_col_idxs}" "$dedup_header_file") "$temp_updated_dates_file" |
        "$QSV" select "$placeholder_headers" -o "$normalized_date_file"
    
    # "$SED" -i "s/$EMPTY_VALUE_TOKEN~//g" $normalized_date_file # remove empty value token

    "$QSV" cat rows -n <(echo "$original_headers") <("$QSV" behead "$normalized_date_file") -o "$normalized_date_file"
fi
## End ##

## Preprocess: Get primary key column index
declare -a initial_headers
IFS= readarray -t -d '' initial_headers < <("./scripts/get-csv-header" -file "$normalized_date_file" -print0 -replaceEmpty "$EMPTY_HEADER_TOKEN")

export id_col_colnum=-1
export missing_id_col=true
for col in "${!initial_headers[@]}"; do
    if [[ ${initial_headers[$col]} == "$ID_COL_NAME" ]]; then
        id_col_colnum=$((col + 1))
        missing_id_col=true
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
"$QSV" select "$SELECTING_COLS_STR" "$normalized_date_file" -o "$removed_empty_header_file"
## End ##

## Preprocess: Normalize headers
# Must get header again to account for removed rows
input_file="$removed_empty_header_file"
declare -a normalized_headers
IFS= readarray -t -d '' normalized_headers < <("./scripts/get-csv-header" -file "$input_file" -print0 -dedupe)
normalized_header_file=$TEMP_DIR/normalized_header.csv
cat <(
    IFS=,
    echo "${normalized_headers[*]}"
) <("$QSV" behead "$input_file") >"$normalized_header_file"

if ((id_col_colnum == -1)); then
    # Using table with row number to add id column, keeping input table intact
    "$QSV" cat columns --pad "$input_file" <(echo "$ID_COL_NAME") -o "$normalized_header_file"
    id_col_colnum=$((${#initial_headers[@]} + 1))
    normalized_headers+=("$ID_COL_NAME")
    debug-log "New id column index: ${id_col_colnum}"
else
    # If has id column => move to end to accurately join using "$QSV"
    "$QSV" cat columns <("$QSV" select "!$ID_COL_NAME" "$input_file") <("$QSV" select "$ID_COL_NAME" "$input_file") -o "$normalized_header_file"
fi
input_file="$normalized_header_file"
## End ##

## Preprocess: Add missing primary key
# Append row number
table_with_row_number="$TEMP_DIR/with_row_number.csv"
record_counts=$("$QSV" count "$input_file")
"$QSV" cat columns "$input_file" <(
    echo "$ROW_NUMBER_COL_NAME"
    seq 2 $((record_counts + 1))
) --output "$table_with_row_number"

# Search missing id rows
table_missing_id_rows="$TEMP_DIR/with_missing_id_rows.csv"
"$QSV" search -s "$ID_COL_NAME" '^$' "$table_with_row_number" -o "$table_missing_id_rows" || true # Suppress exit code 1 when no match found
missing_counts="$("$QSV" count "$table_missing_id_rows")"
debug-log "Number of rows missing primary keys: $missing_counts"

if ((missing_counts == 0)); then
    appended_id_file="$input_file"
else
    # Add missing ids
    table_id_for_missing_rows="$TEMP_DIR/id_for_missing_rows.csv"
    "$QSV" cat columns \
        <("$QSV" select "!${ID_COL_NAME}" "$table_missing_id_rows") \
        <(./scripts/generate-id --columnName "$ID_COL_NAME" --n "$missing_counts") |
        "$QSV" select "${ID_COL_NAME},${ROW_NUMBER_COL_NAME}" --output "$table_id_for_missing_rows"

    appended_id_file="$TEMP_DIR/appended_id.csv"

    "$QSV" cat rows \
        <("$QSV" search -s "$ID_COL_NAME" -v "^$" "$table_with_row_number" | "$QSV" select "!${ROW_NUMBER_COL_NAME}") \
        <("$QSV" join "$ROW_NUMBER_COL_NAME" "$table_with_row_number" $ROW_NUMBER_COL_NAME "$table_id_for_missing_rows" |
            "$QSV" select "!${ID_COL_NAME}[0],${ROW_NUMBER_COL_NAME},${ROW_NUMBER_COL_NAME}[1]") --output "$appended_id_file"
fi
## End ##
