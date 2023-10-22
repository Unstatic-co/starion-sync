sleep 5

# command="echo 'rs.initiate({_id: \"rs0\", members: [{_id: 1, \"host\": \"localhost:27017\"}]}) || rs.status().ok' | mongosh -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --quiet | true"
command="mongosh -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --eval 'rs.initiate({_id: \"rs0\", members: [{_id: 1, \"host\": \"localhost:27017\"}]})'"
flyctl machine exec "$FLY_MACHINE_ID" "$command" -a $FLY_APP --access-token "$FLY_ACCESS_TOKEN"
