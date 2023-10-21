# # FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:440.0.0-slim
# # FROM gcr.io/cloud-builders/gcloud
# FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:440.0.0-alpine

# RUN curl -L https://fly.io/install.sh | sh
# ENV PATH="${PATH}:/root/.fly/bin"

# RUN apk add docker
#

FROM alpine:3.17.0 AS terraform_builder
WORKDIR /app
ARG TERRAFORM_VERSION=1.6.1
RUN apk add --no-cache unzip curl \
    && curl -Lo terraform.zip "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
    && unzip terraform.zip -d /terraform

FROM --platform=linux/amd64 google/cloud-sdk:451.0.1-slim

# docker dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg2 \
    unzip \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/* /var/tmp/*

# remove current docker
RUN rm /usr/local/bin/docker \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - \
    && add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/debian \
    $(lsb_release -cs) \
    stable" \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io \
    && rm -rf /var/lib/apt/lists/* /var/tmp/*

# install flyctl
RUN curl -L https://fly.io/install.sh | sh
ENV PATH "$PATH:/root/.fly/bin"

COPY --from=terraform_builder /terraform /usr/local/bin

ENTRYPOINT ["tail", "-f", "/dev/null"]
