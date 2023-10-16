package logging

import (
	"metadata/pkg/config"

	"github.com/sirupsen/logrus"
)

func Setup() {
	if logLevel, err := logrus.ParseLevel(config.AppConfig.LogLevel); err != nil {
		logrus.Fatalf("Fail to parse log level: %v", err)
		panic(err)
	} else {
		logrus.SetLevel(logLevel)
		logrus.SetFormatter(&logrus.JSONFormatter{})
	}
}
