package google_sheets

import (
	"context"
	"downloader/pkg/config"
	"fmt"
	"os"
	"os/exec"
	"time"

	"golang.org/x/sync/errgroup"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"

	log "github.com/sirupsen/logrus"
)

var defaultScopes []string = []string{
	drive.DriveMetadataScope,
	drive.DriveFileScope,
}

type GoogleSheetsServiceInitParams struct {
	// info
	SpreadsheetId string `json:"spreadsheetId"`
	SheetId       string `json:"sheetId"`

	// auth
	AccessToken string `json:"accessToken"`

	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
}

type GoogleSheetsService struct {
	// info
	spreadsheetId string
	sheetId       string

	// auth
	accessToken string

	// data
	dataSourceId string
	syncVersion  int

	// client

	// service
	sheetService *sheets.Service
	driveService *drive.Service

	// entity
	spreadsheet *sheets.Spreadsheet
	sheet       *sheets.Sheet

	// loger
	logger *log.Entry
}

func New(params GoogleSheetsServiceInitParams) *GoogleSheetsService {
	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"spreadsheetId": params.SpreadsheetId,
		"dataSourceId":  params.DataSourceId,
	})

	// client

	return &GoogleSheetsService{
		spreadsheetId: params.SpreadsheetId,
		sheetId:       params.SheetId,
		accessToken:   params.AccessToken,
		dataSourceId:  params.DataSourceId,
		syncVersion:   params.SyncVersion,
		logger:        loggerEntry,
	}
}

func (source *GoogleSheetsService) Setup(ctx context.Context) error {
	token := oauth2.Token{
		AccessToken: source.accessToken,
		Expiry:      time.Now().Add(-30 * time.Minute),
	}
	googleConfig, err := google.ConfigFromJSON(
		[]byte("hihi"),
		defaultScopes...,
	)
	if err != nil {
		return err
	}

	client := googleConfig.Client(ctx, &token)
	group, newCtx := errgroup.WithContext(ctx)

	group.Go(func() error {
		var err error
		source.sheetService, err = sheets.NewService(newCtx, option.WithHTTPClient(client))
		if err != nil {
			return err
		}
		return nil
	})

	group.Go(func() error {
		var err error
		source.driveService, err = drive.NewService(newCtx, option.WithHTTPClient(client))
		if err != nil {
			return err
		}
		return nil
	})
	err = group.Wait()
	if err != nil {
		return err
	}

	return nil
}

func (source *GoogleSheetsService) Download(ctx context.Context) error {
	var debugParam string
	if config.AppConfig.IsProduction {
		debugParam = "off"
	} else {
		debugParam = "on"
	}

	cmd := exec.CommandContext(
		ctx,
		"bash",
		"scripts/download-google-sheets.sh",
		"--spreadsheetId", source.spreadsheetId,
		"--sheetId", source.sheetId,
		"--accessToken", source.accessToken,
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
