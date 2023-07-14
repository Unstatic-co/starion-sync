package excel

import (
	"context"
	"fmt"
	"loader/pkg/config"
	"os"
	"os/exec"

	log "github.com/sirupsen/logrus"
)

type MicrosoftExcelServiceInitParams struct {
	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
}

type MicrosoftExcelService struct {
	// info
	syncflowId   string
	dataSourceId string
	syncVersion  int

	// loger
	logger *log.Entry
}

func NewExcelService(params MicrosoftExcelServiceInitParams) *MicrosoftExcelService {
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"dataSourceId": params.DataSourceId,
		"syncVersion":  params.SyncVersion,
	})
	return &MicrosoftExcelService{
		dataSourceId: params.DataSourceId,
		syncVersion:  params.SyncVersion,
		logger:       loggerEntry,
	}
}

func (source *MicrosoftExcelService) Load(ctx context.Context) error {
	var debugParam string
	if config.AppConfig.IsProduction {
		debugParam = "off"
	} else {
		debugParam = "on"
	}
	// timeoutCtx, _ := context.WithTimeout(ctx, 15*time.Minute)
	cmd := exec.CommandContext(
		ctx,
		"bash",
		"./load-excel.sh",
		"--dataSourceId", source.dataSourceId,
		"--syncVersion", fmt.Sprintf("%d", source.syncVersion),
		"--s3Url", config.AppConfig.S3Url,
		"--s3Region", config.AppConfig.S3Region,
		"--s3Bucket", config.AppConfig.S3DiffDataBucket,
		"--s3AccessKey", config.AppConfig.S3AccessKey,
		"--s3SecretKey", config.AppConfig.S3SecretKey,
		"--debug", debugParam,
	)

	outputWriter := source.logger.WriterLevel(log.InfoLevel)
	errorWriter := source.logger.WriterLevel(log.ErrorLevel)
	defer outputWriter.Close()
	defer errorWriter.Close()
	cmd.Stdout = outputWriter
	cmd.Stderr = errorWriter

	if err := cmd.Run(); err != nil {
		return err
	}

	return nil
}
