FROM redis:6.2-alpine
ARG PASS=randompasswordforredis

EXPOSE 6379
ENV REDIS_ARGS="--requirepass ${PASS} --port 6379 --bind 0.0.0.0 --protected-mode no --maxmemory-policy noeviction --appendonly yes --save 720 1 60 100 12 10000 --dir /data"
ENTRYPOINT ["redis-server", "${REDIS_ARGS}"]