FROM node:18.16.0-alpine3.17 AS builder
RUN npm install -g pnpm
WORKDIR /workdir
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build @app/worker \
    && pnpm prune --prod

FROM node:18.16.0-alpine3.17
WORKDIR /app
COPY --from=builder /workdir/dist/apps/worker ./dist
COPY --from=builder /workdir/node_modules ./node_modules
CMD ["node", "dist/apps/worker/src/main.js"]