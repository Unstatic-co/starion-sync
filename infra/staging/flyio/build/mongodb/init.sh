export MONGO_INITDB_ROOT_USERNAME=admin
export MONGO_INITDB_ROOT_PASSWORD=123456

mongod --replSet rs0 --bind_ip_all --keyFile /tmp/key.file
sleep 10
echo 'rs.initiate({_id: "rs0", members: [{_id: 1, "host": "localhost:27017"}]}) || rs.status().ok' | mongosh -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --quiet | true
echo 'db.createUser({ user: "admin", pwd: "123456", roles: [ "root" ] })' | mongosh -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --quiet | true