db.createUser({
  user: 'admin',
  pwd: 'abc123456',
  roles: [
    {
      role: 'readWrite',
      db: 'starion-sync',
    },
  ],
});
db.createCollection('test'); // MongoDB creates the database when you first store data in that database
