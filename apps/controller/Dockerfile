FROM node:18.16.0-bullseye-slim AS builder
RUN npm install -g pnpm
WORKDIR /workdir
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build @app/controller \
    && pnpm prune --prod

FROM node:18.16.0-bullseye-slim
RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /workdir/dist/apps/controller ./dist
COPY --from=builder /workdir/node_modules ./node_modules
CMD ["node", "dist/apps/controller/src/main.js"]