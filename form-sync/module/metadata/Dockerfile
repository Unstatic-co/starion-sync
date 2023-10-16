FROM golang:1.20.5-bullseye AS binary_builder
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
    && curl -Lo qsv.zip "https://github.com/jqnatividad/qsv/releases/download/${QSV_VERSION}/qsv-${QSV_VERSION}-x86_64-unknown-linux-musl.zip" \
    && unzip qsv.zip -d /app/qsv

# FROM golang:1.20.5-alpine3.18
FROM golang:1.20.5-bullseye
WORKDIR /app
# RUN apk add --no-cache bash curl parallel xxd sed jq tzdata
RUN apt-get update \
    && apt-get install -y \
    curl \
    sed \
    jq \
    && rm -rf /var/lib/apt/lists/*
COPY --from=qsv_builder /app/qsv /usr/local/bin
COPY --from=binary_builder /dist/ /app/
ENTRYPOINT ["./metadata"]