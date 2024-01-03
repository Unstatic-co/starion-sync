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
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"

	log "github.com/sirupsen/logrus"
)

type GoogleSheetsDownloadServiceInitParams struct {
	// info
	SpreadsheetId      string `json:"spreadsheetId"`
	SpreadsheetVersion int    `json:"syncVersion"`

	// auth
	AccessToken string `json:"accessToken"`
}

type GoogleSheetsDownloadService struct {
	// info
	spreadsheetId string

	// auth
	accessToken string

	// data
	spreadsheetVersion string

	// service
	driveService *drive.Service

	// resource
	downloadUrl string

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
		spreadsheetId: params.SpreadsheetId,
		accessToken:   params.AccessToken,
		logger:        loggerEntry,
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

	// get drive info
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
}

func (s *GoogleSheetsDownloadService) Run(ctx context.Context) (*DownloadResult, error) {
	s.logger.Info("Download google sheets for spreadsheet ", s.spreadsheetId)

	client := &http.Client{}
	req, err := http.NewRequest("GET", s.downloadUrl, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.accessToken))
	req.Header.Set("Accept", "text/csv")

	for {
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode == http.StatusOK {
			fileBytes, err := io.ReadAll(resp.Body)
			resp.Body.Close()
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
			err = handler.UploadFileWithBytes(GetSpreadSheetFileS3Key(s.spreadsheetId), fileBytes)
			if err != nil {
				return nil, fmt.Errorf("Error when upload file to s3: %w", err)
			}
			return &DownloadResult{
				SpreadsheetVersion: s.spreadsheetVersion,
			}, nil
		} else if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			time.Sleep(5 * time.Second) // Wait for 5 seconds before retrying
		} else {
			resp.Body.Close()
			return nil, fmt.Errorf("Failed to download file: %s", resp.Status)
		}
	}
}

func (source *GoogleSheetsDownloadService) Close(ctx context.Context) error {
	return nil
}
