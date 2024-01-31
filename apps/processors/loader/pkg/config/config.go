package config

import (
	"github.com/caarlos0/env/v9"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
)

type DbType string

const (
	DbTypePostgres DbType = "postgres"
)

type IAppConfig struct {
	IsProduction bool   `env:"PRODUCTION" envDefault:"false"`
	Port         int    `env:"PORT" envDefault:"8080"`
	ReadTimeout  int    `env:"READ_TIMEOUT" envDefault:"30"`
	WriteTimeout int    `env:"WRITE_TIMEOUT" envDefault:"900"`
	LogLevel     string `env:"LOG_LEVEL" envDefault:"debug"`
	ApiKeys      string `env:"API_KEYS" envDefault:"api-keys"`

	// S3
	S3Endpoint       string `env:"S3_ENDPOINT" envDefault:"minio:9000"`
	S3Region         string `env:"S3_REGION" envDefault:"us-east-1"`
	S3DiffDataBucket string `env:"S3_DIFF_DATA_BUCKET" envDefault:"diff-data"`
	S3AccessKey      string `env:"S3_ACCESS_KEY" envDefault:"admin"`
	S3SecretKey      string `env:"S3_SECRET_KEY" envDefault:"abc123456"`
	S3Ssl            bool   `env:"S3_SSL" envDefault:"false"`

	// Dest DB
	DbType     DbType `env:"DB_TYPE" envDefault:"postgres"`
	DbUri      string `env:"DB_URI" envDefault:""`
	DbHost     string `env:"DB_HOST" envDefault:"postgresql"`
	DbPort     int    `env:"DB_PORT" envDefault:"5432"`
	DbUser     string `env:"DB_USER" envDefault:"admin"`
	DbPassword string `env:"DB_PASSWORD" envDefault:"abc123456"`
	DbName     string `env:"DB_NAME" envDefault:"starion-sync"`
	DbSslMode  string `env:"DB_SSL_MODE" envDefault:"disable"`

	// Postgres loader
	PostgrestInsertBactchSize int `env:"POSTGRES_INSERT_BATCH_SIZE" envDefault:"1000"`
}

var AppConfig = &IAppConfig{}

func Setup() {
	if err := godotenv.Load(); err != nil {
		log.Info("Can not loading .env file")
	}

	if err := env.Parse(AppConfig); err != nil {
		log.Fatalf("Fail to parse config: %v", err)
		panic(err)
	}
}
