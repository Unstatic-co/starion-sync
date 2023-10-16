FROM node:18.16.0-bullseye-slim AS builder
RUN npm install -g pnpm
WORKDIR /workdir
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build @app/configurator \
    && pnpm build @app/controller \
    && pnpm build @app/worker \
    && pnpm build @app/post-processor \
    && pnpm build @app/trigger/cron \
    && pnpm build @app/webhook \
    && pnpm prune --prod

FROM node:18.16.0-bullseye-slim
WORKDIR /app
RUN npm install pm2 -g
COPY --from=builder /workdir/dist/apps/configurator ./dist
COPY --from=builder /workdir/dist/apps/controller ./dist
COPY --from=builder /workdir/dist/apps/worker ./dist
COPY --from=builder /workdir/dist/apps/post-processor ./dist
COPY --from=builder /workdir/dist/apps/triggers/cron ./dist
COPY --from=builder /workdir/dist/apps/webhook ./dist
COPY --from=builder /workdir/node_modules ./node_modules
COPY ./infra/staging/flyio/build/apps/apps.json ./apps.json

EXPOSE 8080
CMD ["--no-daemon", "start", "apps.json"]
ENTRYPOINT ["pm2"]