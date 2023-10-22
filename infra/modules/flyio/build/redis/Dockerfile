FROM redis:6.2-alpine
ARG PASS=randompasswordforredis

EXPOSE 6379
# CMD ["--requirepass 123456 --port 6379 --bind 0.0.0.0 --protected-mode no --maxmemory-policy noeviction --appendonly yes --save 720 1 60 100 12 10000 --dir /data"]
ENTRYPOINT ["redis-server", "--requirepass 123456"]