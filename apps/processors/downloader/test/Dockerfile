FROM rust:1.72.0 as builder
WORKDIR /app
ARG QSV_VERSION=0.110.0
RUN apt-get update && apt-get install -y build-essential libclang-dev bash unzip
RUN curl -Lo qsv.zip "https://github.com/jqnatividad/qsv/archive/refs/tags/0.110.0.zip"
RUN  unzip qsv.zip -d . && cd qsv-0.110.0 && cargo build --release --locked --bin qsv -F feature_capable,to
ENTRYPOINT ["bash"]