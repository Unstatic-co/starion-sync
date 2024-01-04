package google_sheets

import (
	"context"
	"downloader/pkg/config"
	"downloader/pkg/e"
	"downloader/util"
	"downloader/util/s3"
	"fmt"
	"os"
	"os/exec"
	"strconv"

	"golang.org/x/sync/errgroup"
	"google.golang.org/api/drive/v3"

	log "github.com/sirupsen/logrus"
)

type DownloadExternalError struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

var defaultScopes []string = []string{
	drive.DriveMetadataScope,
	drive.DriveFileScope,
}

type GoogleSheetsIngestServiceInitParams struct {
	// info
	SpreadsheetId string `json:"spreadsheetId"`
	SheetId       string `json:"sheetId"`
	// TimeZone      string `json:"timeZone"`
	// SheetName     string `json:"sheetName"`
	// SheetIndex    int64  `json:"sheetIndex"` // from 0

	// auth
	AccessToken string `json:"accessToken"`

	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
}

type GoogleSheetsIngestService struct {
	// info
	spreadsheetId string
	sheetId       string
	sheetName     string
	sheetIndex    int64
	timeZone      string

	// auth
	accessToken string

	// data
	dataSourceId string
	syncVersion  int

	// resource
	spreadsheetFilePath string

	// loger
	logger *log.Entry
}

func NewIngestService(params GoogleSheetsIngestServiceInitParams) *GoogleSheetsIngestService {
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

	return &GoogleSheetsIngestService{
		spreadsheetId: params.SpreadsheetId,
		sheetId:       params.SheetId,
		// sheetName:     params.SheetName,
		// sheetIndex:    params.SheetIndex,
		// timeZone:      params.TimeZone,
		accessToken:  params.AccessToken,
		dataSourceId: params.DataSourceId,
		syncVersion:  params.SyncVersion,
		logger:       loggerEntry,
	}
}

func (s *GoogleSheetsIngestService) Setup(ctx context.Context) error {
	s.logger.Info("Setup google sheets ingest service")

	handler, err := s3.NewHandlerWithConfig(&s3.S3HandlerConfig{
		Endpoint:  config.AppConfig.S3Endpoint,
		Region:    config.AppConfig.S3Region,
		AccessKey: config.AppConfig.S3AccessKey,
		SecretKey: config.AppConfig.S3SecretKey,
		Bucket:    config.AppConfig.S3DiffDataBucket,
	})
	if err != nil {
		return err
	}
	group, _ := errgroup.WithContext(ctx)

	group.Go(func() error {
		// TODO: download spreadsheet file
		s.logger.Info("Downloading saved spreadsheet")
		filePath, err := util.GenerateTempFileName(s.spreadsheetId, "xlsx", false)
		if err != nil {
			return err
		}
		err = handler.DownloadFile(GetSpreadSheetFileS3Key(s.spreadsheetId), filePath)
		if err != nil {
			return err
		}
		s.spreadsheetFilePath = filePath
		return nil
	})

	group.Go(func() error {
		// TODO: get spreadsheet & sheets info
		s.logger.Info("Get spreadsheet & sheets info")
		fileMetadata, err := handler.GetObjectMetadata(GetSpreadSheetFileS3Key(s.spreadsheetId))
		if err != nil {
			return err
		}
		s.logger.Debug("Spreadsheet file metadata", fileMetadata)
		spreadsheetMetadata, err := DeserializeSpreadsheetFileMetadata(fileMetadata)
		if err != nil {
			return err
		}
		s.logger.Info("Spreadsheet metadata", spreadsheetMetadata)
		s.sheetName = spreadsheetMetadata.Sheets[s.sheetId].SheetName
		s.sheetIndex = spreadsheetMetadata.Sheets[s.sheetId].SheetIndex
		return nil
	})

	err = group.Wait()
	if err != nil {
		return err
	}

	return nil
}

func (s *GoogleSheetsIngestService) Run(ctx context.Context) error {

	var debugParam string
	if config.AppConfig.IsProduction {
		debugParam = "off"
	} else {
		debugParam = "on"
	}

	externalErrorFile, err := util.CreateTempFileWithContent("ext", "json", "{}")
	if err != nil {
		return fmt.Errorf("Cannot generate temp file: %w", err)
	}
	s3Host, _ := util.ConvertS3URLToHost(config.AppConfig.S3Endpoint)
	defer util.DeleteFile(externalErrorFile)

	cmd := exec.CommandContext(
		ctx,
		"bash",
		"./ingest-google-sheets.sh",
		"--externalErrorFile", externalErrorFile,
		"--spreadsheetId", s.spreadsheetId,
		"--sheetId", s.sheetId,
		"--sheetName", s.sheetName,
		"--sheetIndex", fmt.Sprintf("%d", s.sheetIndex+1),
		"--spreadsheetFile", s.spreadsheetFilePath,
		"--timezone", s.timeZone,
		"--accessToken", s.accessToken,
		"--dataSourceId", s.dataSourceId,
		"--syncVersion", fmt.Sprintf("%d", s.syncVersion),
		"--s3Endpoint", config.AppConfig.S3Endpoint,
		"--s3Host", s3Host,
		"--s3Region", config.AppConfig.S3Region,
		"--s3Bucket", config.AppConfig.S3DiffDataBucket,
		"--s3AccessKey", config.AppConfig.S3AccessKey,
		"--s3SecretKey", config.AppConfig.S3SecretKey,
		"--s3Ssl", strconv.FormatBool(config.AppConfig.S3Ssl),
		"--debug", debugParam,
	)

	outputWriter := s.logger.WriterLevel(log.InfoLevel)
	errorWriter := s.logger.WriterLevel(log.ErrorLevel)
	defer outputWriter.Close()
	defer errorWriter.Close()
	cmd.Stdout = outputWriter
	cmd.Stderr = errorWriter

	if err := cmd.Run(); err != nil {
		log.Debug("Error when running ingest script: ", err)
		// check external error
		var externalError DownloadExternalError
		marshalErr := util.MarshalJsonFile(externalErrorFile, &externalError)
		if marshalErr != nil {
			return fmt.Errorf("Cannot read external error file: %w", err)
		}
		if externalError.Code != 0 {
			return e.NewExternalErrorWithDescription(externalError.Code, externalError.Msg, "External error when running ingest script")
		}

		return err
	}

	return nil
}

func (source *GoogleSheetsIngestService) Close(ctx context.Context) error {
	util.DeleteFile(source.spreadsheetFilePath)
	return nil
}
