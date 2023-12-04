# FROM redis:6.2-alpine

# ARG REDIS_PASSWORD
# ENV REDIS_PASSWORD=${REDIS_PASSWORD}
# EXPOSE 6379
# # CMD ["--requirepass ${REDIS_PASSWORD}"]
# # ENTRYPOINT ["sh","-c","echo 'hehe' && redis-server --requirepass $REDIS_PASSWORD"]

FROM redis/redis-stack-server:6.2.6-v4

EXPOSE 6379
# ENV REDIS_ARGS="--requirepass ${PASS} --port 6379 --bind 0.0.0.0 --protected-mode no --maxmemory-policy noeviction --appendonly yes --save 720 1 60 100 12 10000 --dir /data"