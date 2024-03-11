FROM --platform=linux/amd64 golang:1.22.1 AS binary_builder
WORKDIR /app
COPY go.mod ./
COPY go.sum ./
RUN go mod download
COPY . .
RUN chmod +x ./build.sh && ./build.sh --scriptDir scripts --outDir /dist

FROM alpine:3.17.0 AS qsv_builder
## QSV_VER MUST be a specific version
WORKDIR /app
ARG QSV_VERSION=0.110.0
RUN apk add --no-cache bash unzip curl \
    ## && QSV_VERSION=$(curl -s "https://api.github.com/repos/jqnatividad/qsv/releases/latest" | grep -oE '"tag_name": "[0-9.]+' | cut -d'"' -f 4) \
    && echo "Current QSV version: ${QSV_VERSION}" \
    && curl -Lo qsv.zip "https://github.com/jqnatividad/qsv/releases/download/${QSV_VERSION}/qsv-${QSV_VERSION}-x86_64-unknown-linux-gnu.zip" \
    && unzip qsv.zip -d /app/qsv

FROM alpine:3.17.0 AS duckdb_builder
WORKDIR /app
ARG DUCKDB_VERSION=0.8.1
RUN apk add --no-cache bash unzip curl \
    && echo "Current Duckdb version: ${DUCKDB_VERSION}" \
    && curl -Lo duckdb.zip "https://github.com/duckdb/duckdb/releases/download/v${DUCKDB_VERSION}/duckdb_cli-linux-amd64.zip" \
    && unzip duckdb.zip -d /app/duckdb \
    && curl -Lo spatial.gz "http://extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/spatial.duckdb_extension.gz" \
    && curl -Lo httpfs.gz "http://extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/httpfs.duckdb_extension.gz" \
    && gunzip spatial.gz \
    && gunzip httpfs.gz

# FROM golang:1.20.5-alpine3.18
FROM --platform=linux/amd64 golang:1.22.1
WORKDIR /app
# RUN apk add --no-cache bash curl parallel xxd sed jq tzdata
RUN apt-get update \
    && apt-get install -y \
    curl \
    sed \
    jq \
    && rm -rf /var/lib/apt/lists/*
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
RUN echo 'source $HOME/.cargo/env' >> $HOME/.bashrc
COPY --from=qsv_builder /app/qsv /usr/local/bin
COPY --from=duckdb_builder /app/duckdb /usr/local/bin
COPY --from=duckdb_builder /app/spatial /app/httpfs /app/
COPY --from=binary_builder /dist/ /app/
RUN duckdb :memory: "install httpfs; install spatial;"
ENTRYPOINT ["./downloader"]