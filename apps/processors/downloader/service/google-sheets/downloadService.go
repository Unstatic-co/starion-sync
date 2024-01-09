package google_sheets

import (
	"context"
	"downloader/pkg/config"
	"downloader/pkg/e"
	"downloader/util/s3"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/sync/errgroup"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"

	log "github.com/sirupsen/logrus"
)

type GoogleSheetsDownloadServiceInitParams struct {
	// info
	DataProviderId     string `json:"dataProviderId"`
	SpreadsheetId      string `json:"spreadsheetId"`
	SpreadsheetVersion int    `json:"syncVersion"`

	// auth
	AccessToken string `json:"accessToken"`
}

type GoogleSheetsDownloadService struct {
	// info
	dataProviderId string
	spreadsheetId  string

	// auth
	accessToken string

	// data
	spreadsheetVersion string
	timeZone           string

	// service
	driveService *drive.Service
	sheetService *sheets.Service

	spreadsheet *sheets.Spreadsheet
	sheets      []*sheets.Sheet

	// resource
	downloadUrl     string
	spreadsheetData *[]byte
	metadata        map[string]*string

	// loger
	logger *log.Entry
}

type DownloadResult struct {
	SpreadsheetVersion string
}

func NewDownloadService(params GoogleSheetsDownloadServiceInitParams) *GoogleSheetsDownloadService {
	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"spreadsheetId": params.SpreadsheetId,
	})

	return &GoogleSheetsDownloadService{
		dataProviderId: params.DataProviderId,
		spreadsheetId:  params.SpreadsheetId,
		accessToken:    params.AccessToken,
		logger:         loggerEntry,
	}
}

func (s *GoogleSheetsDownloadService) Setup(ctx context.Context) error {
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
		// TODO: get spreadsheet file info
		s.logger.Info("Get drive file info")
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
		link.RawQuery = query.Encode()
		s.downloadUrl = link.String()
		s.spreadsheetVersion = strconv.FormatInt(driveFile.Version, 10)

		s.logger.Debug("Download url: ", s.downloadUrl)

		return nil
	})

	group.Go(func() error {
		// TODO: setup spreadsheet service
		s.logger.Info("Get sheet info")
		var err error
		s.sheetService, err = sheets.NewService(newCtx, option.WithTokenSource(tokenSource))
		if err != nil {
			return e.WrapInternalError(err, e.INIT_GOOGLE_SHEETS_SERVICE, "Init sheets service error")
		}

		return nil
	})

	err := group.Wait()
	if err != nil {
		return err
	}

	return nil
}

func (s *GoogleSheetsDownloadService) Run(ctx context.Context) (*DownloadResult, error) {
	s.logger.Info("Run download for spreadsheet ", s.spreadsheetId)

	group, _ := errgroup.WithContext(ctx)

	group.Go(func() error {
		// TODO: download spreadsheet
		s.logger.Info("Downloading spreadsheet ", s.spreadsheetId)
		client := &http.Client{}
		req, err := http.NewRequest("GET", s.downloadUrl, nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.accessToken))
		req.Header.Set("Accept", "text/csv")

		for {
			resp, err := client.Do(req)
			if err != nil {
				return err
			}

			if resp.StatusCode == http.StatusOK {
				fileBytes, err := io.ReadAll(resp.Body)
				resp.Body.Close()
				if err != nil {
					return err
				}
				s.spreadsheetData = &fileBytes
				return nil
			} else if resp.StatusCode == http.StatusTooManyRequests {
				resp.Body.Close()
				time.Sleep(5 * time.Second) // Wait for 5 seconds before retrying
				s.logger.Info("Rate limit exceeded for downloading spreadsheet ", s.spreadsheetId)
			} else {
				resp.Body.Close()
				return fmt.Errorf("Failed to download file: %s", resp.Status)
			}
		}
	})

	group.Go(func() error {
		// TODO: get spreadsheet & sheets info
		s.logger.Info("Get spreadsheet & sheets info")
		spreadsheet, err := s.sheetService.Spreadsheets.Get(s.spreadsheetId).Fields(
			"sheets.properties.sheetId",
			"sheets.properties.index",
			"sheets.properties.title",
			"properties.timeZone",
		).Do()
		if err != nil {
			return WrapSpreadSheetApiError(err.(*googleapi.Error))
		}
		s.timeZone = spreadsheet.Properties.TimeZone
		s.logger.Debug("Sheet timezone: ", s.timeZone)
		s.sheets = spreadsheet.Sheets
		return nil
	})

	err := group.Wait()
	if err != nil {
		return nil, err
	}

	handler, err := s3.NewHandlerWithConfig(&s3.S3HandlerConfig{
		Endpoint:  config.AppConfig.S3Endpoint,
		Region:    config.AppConfig.S3Region,
		AccessKey: config.AppConfig.S3AccessKey,
		SecretKey: config.AppConfig.S3SecretKey,
		Bucket:    config.AppConfig.S3DiffDataBucket,
	})
	if err != nil {
		return nil, err
	}

	// TODO: upload spreadsheet
	sheetsMetadata := make(map[string]SheetsMetadata) // sheetId -> SheetMetadata
	if err != nil {
		return nil, err
	}
	for _, sheet := range s.sheets {
		sheetId := strconv.FormatInt(sheet.Properties.SheetId, 10)
		sheetsMetadata[sheetId] = SheetsMetadata{
			SheetId:    sheetId,
			SheetIndex: sheet.Properties.Index,
			SheetName:  sheet.Properties.Title,
		}
	}
	spreadsheetMetadata := &SpreadsheetMetadata{
		SpreadsheetId:      s.spreadsheetId,
		SpreadsheetVersion: s.spreadsheetVersion,
		TimeZone:           s.timeZone,
		Sheets:             sheetsMetadata,
	}
	spreadsheetFileMetadata, err := SerializeSpreadsheetFileMetadata(*spreadsheetMetadata)
	if err != nil {
		return nil, fmt.Errorf("Error when serialize spreadsheet metadata: %w", err)
	}
	err = handler.UploadFileWithBytes(GetSpreadSheetFileS3Key(s.dataProviderId), *s.spreadsheetData, spreadsheetFileMetadata)
	if err != nil {
		return nil, fmt.Errorf("Error when upload spreadsheet: %w", err)
	}

	return &DownloadResult{
		SpreadsheetVersion: s.spreadsheetVersion,
	}, nil
}

func (source *GoogleSheetsDownloadService) Close(ctx context.Context) error {
	return nil
}
