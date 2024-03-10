package google_sheets

import (
	"bytes"
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

	jsoniter "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
)

var defaultScopes []string = []string{
	drive.DriveMetadataScope,
	drive.DriveFileScope,
}

type GoogleSheetsIngestServiceInitParams struct {
	// info
	DataProviderId string `json:"dataProviderId"`
	SpreadsheetId  string `json:"spreadsheetId"`
	SheetId        string `json:"sheetId"`
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
	xlsxSheetName string
	sheetIndex    int64
	timeZone      string

	// auth
	accessToken string

	// data
	dataProviderId string
	dataSourceId   string
	syncVersion    int

	// resource
	spreadsheetFilePath string

	// loger
	logger *log.Entry
}

type IngestError struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	IsExternal bool `json:"isExternal"`
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
		dataProviderId: params.DataProviderId,
		dataSourceId:   params.DataSourceId,
		spreadsheetId:  params.SpreadsheetId,
		sheetId:        params.SheetId,
		// sheetName:     params.SheetName,
		// sheetIndex:    params.SheetIndex,
		// timeZone:      params.TimeZone,
		accessToken: params.AccessToken,
		syncVersion: params.SyncVersion,
		logger:      loggerEntry,
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
		err = handler.DownloadFile(GetSpreadSheetFileS3Key(s.dataProviderId), filePath)
		if err != nil {
			return err
		}
		s.spreadsheetFilePath = filePath
		return nil
	})

	group.Go(func() error {
		// TODO: get spreadsheet & sheets info
		s.logger.Info("Get spreadsheet & sheets info")
		fileMetadata, err := handler.GetObjectMetadata(GetSpreadSheetFileS3Key(s.dataProviderId))
		if err != nil {
			return err
		}
		if len(fileMetadata) == 0 {
			return fmt.Errorf("Spreadsheet file metadata not found")
		}
		spreadsheetMetadata, err := DeserializeSpreadsheetFileMetadata(fileMetadata)
		if err != nil {
			return err
		}
		
		s.sheetName = spreadsheetMetadata.Sheets[s.sheetId].SheetName
		s.xlsxSheetName = spreadsheetMetadata.Sheets[s.sheetId].XlsxSheetName
		s.sheetIndex = spreadsheetMetadata.Sheets[s.sheetId].SheetIndex
		s.timeZone = spreadsheetMetadata.TimeZone
		s.logger.Debug("Sheet name: ", s.sheetName)
		s.logger.Debug("Sheet index: ", s.sheetIndex)
		s.logger.Debug("Time zone: ", s.timeZone)
		return nil
	})

	err = group.Wait()
	if err != nil {
		return err
	}

	return nil
}

func (s *GoogleSheetsIngestService) Run(ctx context.Context) error {

	// var debugParam string
	// if config.AppConfig.IsProduction {
		// debugParam = "off"
	// } else {
		// debugParam = "on"
	// }

	externalErrorFile, err := util.CreateTempFileWithContent("ext", "json", "{}")
	if err != nil {
		return fmt.Errorf("Cannot generate temp file: %w", err)
	}
	// s3Host, _ := util.ConvertS3URLToHost(config.AppConfig.S3Endpoint)
	defer util.DeleteFile(externalErrorFile)

	cmd := exec.CommandContext(
		ctx,
		"./google-sheets/do-all",
		"--xlsxFile", s.spreadsheetFilePath,
		"--xlsxSheetName", s.xlsxSheetName,
		"--spreadsheetId", s.spreadsheetId,
		"--sheetId", s.sheetId,
		"--sheetName", s.sheetName,
		// "--sheetIndex", fmt.Sprintf("%d", s.sheetIndex+1),
		"--accessToken", s.accessToken,
		"--dataSourceId", s.dataSourceId,
		"--syncVersion", fmt.Sprintf("%d", s.syncVersion),
		"--timeZone", s.timeZone,
		"--s3Endpoint", config.AppConfig.S3Endpoint,
		"--s3Region", config.AppConfig.S3Region,
		"--s3Bucket", config.AppConfig.S3DiffDataBucket,
		"--s3AccessKey", config.AppConfig.S3AccessKey,
		"--s3SecretKey", config.AppConfig.S3SecretKey,
		"--s3Ssl", strconv.FormatBool(config.AppConfig.S3Ssl),
		// "--debug", debugParam,
	)

	outputWriter := s.logger.WriterLevel(log.InfoLevel)
	defer outputWriter.Close()
	var stderr bytes.Buffer
	cmd.Stdout = outputWriter
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Debug("Error when running ingest script: ", err)
		// check external error
		var ingestError IngestError
		marshalErr := jsoniter.Unmarshal(stderr.Bytes(), &ingestError)
		if marshalErr != nil {
			return fmt.Errorf("Cannot read error from stderr: %w", err)
		}
		if ingestError.IsExternal {
			return e.NewExternalErrorWithDescription(ingestError.Code, ingestError.Msg, "External error when running ingest script")
		}

		return err
	}

	return nil
}

func (source *GoogleSheetsIngestService) Close(ctx context.Context) error {
	util.DeleteFile(source.spreadsheetFilePath)
	return nil
}
