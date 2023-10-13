FROM node:18.16.0-bullseye-slim AS builder
RUN npm install -g pnpm
WORKDIR /workdir
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build @app/configurator \
    && pnpm prune --prod

FROM node:18.16.0-bullseye-slim
WORKDIR /app
RUN npm install pm2 -g
COPY --from=builder /workdir/dist/apps/configurator ./dist
COPY --from=builder /workdir/node_modules ./node_modules
COPY ./init/apps.json ./apps.json
RUN echo 'hehe'
CMD ["start", "apps.json"]
ENTRYPOINT ["pm2-runtime"]
# ENTRYPOINT ["tail", "-f", "/dev/null"]