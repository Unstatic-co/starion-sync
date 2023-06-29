FROM golang:1.20.5-alpine3.18 AS binary_builder
WORKDIR /app

COPY go.mod ./
COPY go.sum ./

RUN go mod download

COPY . .
RUN go build -tags=jsoniter -o downloader .

FROM golang:1.20.5-alpine3.18
WORKDIR /app
RUN apk add --no-cache bash
COPY --from=binary_builder /app/downloader /app/downloader
ENTRYPOINT ["./downloader"]
