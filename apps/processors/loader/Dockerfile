FROM golang:1.20.5-bullseye AS binary_builder
WORKDIR /app
COPY go.mod ./
COPY go.sum ./
RUN go mod download
COPY . .
RUN chmod +x ./build.sh && ./build.sh --scriptDir scripts --outDir /dist

FROM golang:1.20.5-bullseye
WORKDIR /app
COPY --from=binary_builder /dist/ /app/
ENTRYPOINT ["./comparer"]