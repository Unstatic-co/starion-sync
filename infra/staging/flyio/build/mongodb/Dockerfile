FROM mongo:5.0.21-focal
# RUN echo "rs.initiate({'_id':'rs0', members: [{'_id':1, 'host':'127.0.0.1:27017'}]});" > "/docker-entrypoint-initdb.d/init_replicaset.js"
RUN echo "12345678" > "/tmp/key.file"
RUN chmod 600 /tmp/key.file
RUN chown 999:999 /tmp/key.file

EXPOSE 27017
# COPY ./init.sh ./init.sh
# RUN chmod +x ./init.sh
COPY ./init.js /docker-entrypoint-initdb.d/init.js
# ENTRYPOINT ["/bin/bash", "-c", "./init.sh"]
# CMD ["--replSet", "rs0", "--bind_ip_all", "--keyFile", "/tmp/key.file"]
CMD ["--bind_ip_all", "--keyFile", "/tmp/key.file"]