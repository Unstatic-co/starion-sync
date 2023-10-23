package logging

import (
	"downloader/pkg/config"
	"os"

	"github.com/sirupsen/logrus"
	// lumerjack "gopkg.in/natefinch/lumberjack.v2"
)

func Setup() {
	if logLevel, err := logrus.ParseLevel(config.AppConfig.LogLevel); err != nil {
		logrus.Fatalf("Fail to parse log level: %v", err)
		panic(err)
	} else {
		logrus.SetLevel(logLevel)
		logrus.SetFormatter(&logrus.JSONFormatter{})
		// logrus.SetOutput(&lumerjack.Logger{
		// Filename:   "/var/log/all.log",
		// MaxSize:    30, // megabytes
		// MaxBackups: 3,
		// MaxAge:     10,   //days
		// Compress:   true, // disabled by default
		// })
		logrus.SetOutput(os.Stdout)
	}
}
