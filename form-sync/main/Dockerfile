FROM node:18.17-alpine3.18 AS builder
WORKDIR /workdir
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && pnpm prune --production

FROM node:18.17-alpine3.18
WORKDIR /workdir
COPY --from=builder /workdir/dist ./dist
COPY --from=builder /workdir/node_modules ./node_modules
CMD ["node", "dist/main.js"]