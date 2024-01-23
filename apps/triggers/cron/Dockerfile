FROM node:18.16.0-bullseye-slim AS builder
RUN npm install -g pnpm
WORKDIR /workdir
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build @app/trigger/cron \
    && pnpm prune --prod

FROM node:18.16.0-bullseye-slim
WORKDIR /app
COPY --from=builder /workdir/node_modules ./node_modules
COPY --from=builder /workdir/dist/apps/triggers/cron ./dist
CMD ["node", "dist/apps/triggers/cron/src/main.js"]