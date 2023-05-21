db.createUser(
    {
        user: "admin",
        pwd: "abc123456",
        roles: [
            {
                role: "readWrite",
                db: "base-nestjs"
            }
        ]
    }
);
db.createCollection("test"); //MongoDB creates the database when you first store data in that database