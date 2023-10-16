package database

import (
	"context"
	"metadata/pkg/config"
	"time"

	log "github.com/sirupsen/logrus"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// Client instance
var Client *mongo.Client

const (
	ExcelRowPosCollection = "excel-row-pos"
	ExcelCommonCollection = "excel-common"

	GoogleSheetsRowPosCollection = "google-sheets-row-pos"
	GoogleSheetsCommonCollection = "google-sheets-common"
)

func Setup() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// ctx := context.Background()
	log.Println("Connecting to MongoDB", config.AppConfig.DbUri)
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(config.AppConfig.DbUri))
	if err != nil {
		log.Fatal("Error connecting to MongoDB: ", err.Error())
	}

	// ping the database
	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	err = client.Ping(ctx, readpref.Primary())
	if err != nil {
		log.Fatal("Error pinging MongoDB: ", err.Error())
	}

	Client = client

	// // create indexes
	// ExcelRowPosCollection := GetCollection(client, ExcelRowPosCollection)
	// _, err = ExcelRowPosCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
	// Keys:    bson.M{"_id": 1},
	// Options: options.Index(),
	// })
	// if err != nil {
	// log.Fatal("Error creating index for excel-row-pos collection: ", err.Error())
	// }
	// ExcelCommonCollection := GetCollection(client, ExcelCommonCollection)
	// _, err = ExcelCommonCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
	// Keys:    bson.M{"dataSourceId": 1},
	// Options: options.Index().SetName("dataSourceId"),
	// })
	// if err != nil {
	// log.Fatal("Error creating index for excel common collection: ", err.Error())
	// }

	log.Println("Connected to MongoDB")
}

// getting database collections
func GetCollection(client *mongo.Client, collectionName string) *mongo.Collection {
	collection := client.Database(config.AppConfig.DbName).Collection(collectionName)
	return collection
}
