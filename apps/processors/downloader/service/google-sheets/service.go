package google_sheets

import (
	"context"
	"downloader/pkg/config"
	"downloader/pkg/e"
	"downloader/util"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"strconv"
	"time"

	"golang.org/x/sync/errgroup"

	"golang.org/x/oauth2"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"

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
	sheetName     string
	timezone      string

	// auth
	accessToken string

	// data
	dataSourceId string
	syncVersion  int

	// service
	sheetService *sheets.Service
	driveService *drive.Service

	// entity
	spreadsheet *sheets.Spreadsheet
	sheet       *sheets.Sheet

	// resource
	downloadUrl string

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

func (s *GoogleSheetsService) Setup(ctx context.Context) error {
	s.logger.Info("Setup google sheets service")

	token := oauth2.Token{
		AccessToken: s.accessToken,
		// Expiry:      time.Now().Add(-30 * time.Minute),
	}
	tokenSource := oauth2.StaticTokenSource(&token)

	newCtx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()
	group, newCtx := errgroup.WithContext(newCtx)

	group.Go(func() error {
		// get sheet info
		s.logger.Info("Get sheet info")
		var err error
		s.sheetService, err = sheets.NewService(newCtx, option.WithTokenSource(tokenSource))
		if err != nil {
			return e.WrapInternalError(err, e.INIT_GOOGLE_SHEETS_SERVICE, "Init sheets service error")
		}
		s.spreadsheet, err = s.sheetService.Spreadsheets.Get(s.spreadsheetId).Fields("properties", "sheets.properties").Do()
		if err != nil {
			return WrapSpreadSheetApiError(err.(*googleapi.Error))
		}
		s.timezone = s.spreadsheet.Properties.TimeZone
		sheets := s.spreadsheet.Sheets
		for id := range sheets {
			if fmt.Sprint(sheets[id].Properties.SheetId) == s.sheetId {
				s.sheet = sheets[id]
				s.sheetName = s.sheet.Properties.Title
				break
			}
		}

		s.logger.Debug("Sheet timezone: ", s.timezone)

		return nil
	})

	group.Go(func() error {
		// get drive info
		s.logger.Info("Get drive info")
		var err error
		s.driveService, err = drive.NewService(newCtx, option.WithTokenSource(tokenSource))
		if err != nil {
			return e.WrapInternalError(err, e.INIT_GOOGLE_DRIVE_SERVICE, "Init google drive service error")
		}
		driveFile, err := s.driveService.Files.Get(s.spreadsheetId).Fields("version", "exportLinks").Do()
		if err != nil {
			return WrapGoogleDriveFileError(err.(*googleapi.Error))
		}
		link, err := url.Parse(driveFile.ExportLinks["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])
		query := link.Query()
		query.Set("gid", s.sheetId)
		link.RawQuery = query.Encode()
		s.downloadUrl = link.String()

		s.logger.Debug("Download url: ", s.downloadUrl)

		return nil
	})

	err := group.Wait()
	if err != nil {
		return err
	}

	return nil
}

func (s *GoogleSheetsService) Download(ctx context.Context) error {
	var debugParam string
	if config.AppConfig.IsProduction {
		debugParam = "off"
	} else {
		debugParam = "on"
	}

	externalErrorFile, err := util.GenerateTempFileName("ext", "json")
	if err != nil {
		return fmt.Errorf("Cannot generate temp file: %w", err)
	}

	cmd := exec.CommandContext(
		ctx,
		"bash",
		"./download-google-sheets.sh",
		"--externalErrorFile", externalErrorFile,
		"--spreadsheetId", s.spreadsheetId,
		"--sheetId", s.sheetId,
		"--sheetName", s.sheetName,
		"--downloadUrl", s.downloadUrl,
		"--timezone", s.timezone,
		"--accessToken", s.accessToken,
		"--dataSourceId", s.dataSourceId,
		"--syncVersion", fmt.Sprintf("%d", s.syncVersion),
		"--s3Endpoint", config.AppConfig.S3Endpoint,
		"--s3Url", config.AppConfig.S3Url,
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
		return err
	}

	// check external error
	var externalError DownloadExternalError
	err = util.MarshalJsonFile(externalErrorFile, &externalError)
	if err != nil {
		fmt.Errorf("Cannot read external error file: %w", err)
	}
	if externalError.Code != 0 {
		return e.NewExternalErrorWithDescription(externalError.Code, externalError.Msg, "External error when running download script")
	}

	go util.DeleteFile(externalErrorFile)

	return nil
}

func (source *GoogleSheetsService) Close(ctx context.Context) error {
	return nil
}
