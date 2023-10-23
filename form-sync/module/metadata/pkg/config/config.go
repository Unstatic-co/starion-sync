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

	// Database
	DbHost     string `env:"DB_HOST" envDefault:"localhost"`
	DbPort     int    `env:"DB_PORT" envDefault:"5432"`
	DbUser     string `env:"DB_USER" envDefault:"admin"`
	DbPassword string `env:"DB_PASSWORD" envDefault:"abc123456"`
	DbName     string `env:"DB_NAME" envDefault:"starion-form-sync"`
	DbPath     string `env:"DB_PATH" envDefault:"./leveldb"`
	DbUri      string `env:"DB_URI" envDefault:"mongodb://admin:abc123456@mongodb:27017"`
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
