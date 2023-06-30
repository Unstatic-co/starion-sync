FROM golang:1.20.5-alpine3.18 AS binary_builder
WORKDIR /app

COPY go.mod ./
COPY go.sum ./

RUN go mod download

COPY . .
RUN go build -o ./binary-scripts/get-csv-header ./scripts/get-csv-header.go
RUN go build -tags=jsoniter -o downloader .

FROM alpine:3.17.0 AS pkgs
## QSV_VER MUST be a specific version
WORKDIR /app
RUN apk add --no-cache bash unzip curl \
    && QSV_VERSION=$(curl -s "https://api.github.com/repos/jqnatividad/qsv/releases/latest" | grep -oE '"tag_name": "[0-9.]+' | cut -d'"' -f 4) \
    && echo "Current QSV version: ${QSV_VERSION}" \
    && curl -Lo qsv.zip "https://github.com/jqnatividad/qsv/releases/latest/download/qsv-${QSV_VERSION}-x86_64-unknown-linux-musl.zip" \
    && unzip qsv.zip -d /app/qsv

FROM golang:1.20.5-alpine3.18
WORKDIR /app
RUN apk add --no-cache bash curl parallel xxd sed jq tzdata
COPY ./scripts/*.sh ./scripts/
COPY --from=pkgs /app/qsv /usr/local/bin
COPY --from=binary_builder /app/binary-scripts/ /app/scripts
COPY --from=binary_builder /app/downloader /app/downloader
ENTRYPOINT ["./downloader"]
