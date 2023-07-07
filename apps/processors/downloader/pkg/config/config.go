package config

import (
	"github.com/caarlos0/env/v9"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
)

type IAppConfig struct {
	IsProduction bool   `env:"PRODUCTION" envDefault:"false"`
	Port         int    `env:"PORT" envDefault:"8080"`
	ReadTimeout  int    `env:"READ_TIMEOUT" envDefault:"60"`
	WriteTimeout int    `env:"WRITE_TIMEOUT" envDefault:"90"`
	LogLevel     string `env:"LOG_LEVEL" envDefault:"debug"`

	S3Url            string `env:"S3_URL" envDefault:"http://minio:9000"`
	S3Region         string `env:"S3_REGION" envDefault:"us-east-1"`
	S3DiffDataBucket string `env:"S3_DIFF_DATA_BUCKET" envDefault:"diff-data"`
}

var AppConfig = &IAppConfig{}

func Setup() {
	if err := godotenv.Load(); err != nil {
		log.Info("Error loading .env file")
	}

	if err := env.Parse(AppConfig); err != nil {
		log.Fatalf("Fail to parse config: %v", err)
		panic(err)
	}
}
