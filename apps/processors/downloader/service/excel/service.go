package excel

import (
	"bytes"
	"context"
	"downloader/pkg/config"
	"downloader/pkg/e"
	"downloader/util"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"strconv"

	jsoniter "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
)

type DownloadError struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	IsExternal bool `json:"isExternal"`
}

type MicrosoftExcelServiceInitParams struct {
	// info
	DriveId       string `json:"driveId"`
	WorkbookId    string `json:"workbookId"`
	WorksheetId   string `json:"worksheetId"`
	WorksheetName string `json:"worksheetName"`

	// auth
	AccessToken string `json:"accessToken"`
	SessionId   string `json:"sessionId"`

	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
	Timezone     string `json:"timezone"`
}

type MicrosoftExcelService struct {
	// info
	syncflowId    string
	driveId       string
	workbookId    string
	worksheetId   string
	worksheetName string

	// auth
	accessToken string
	sessionId   string

	// data
	dataSourceId string
	syncVersion  int
	timezone     string

	driveInfo interface{}

	// client
	httpClient http.Client

	// resource
	workbookFilePath string

	// loger
	logger *log.Entry
}

func New(params MicrosoftExcelServiceInitParams) *MicrosoftExcelService {
	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"workbookId":   params.WorkbookId,
		"worksheetId":  params.WorksheetId,
		"dataSourceId": params.DataSourceId,
	})

	// client
	client := &http.Client{}

	return &MicrosoftExcelService{
		driveId:       params.DriveId,
		workbookId:    params.WorkbookId,
		worksheetId:   params.WorksheetId,
		worksheetName: params.WorksheetName,
		accessToken:   params.AccessToken,
		sessionId:     params.SessionId,
		dataSourceId:  params.DataSourceId,
		syncVersion:   params.SyncVersion,
		timezone:      params.Timezone,
		httpClient:    *client,
		logger:        loggerEntry,
	}
}

func (s *MicrosoftExcelService) CreateSessionId(persistChanges bool) error {
	s.logger.Debug("Creating session id")
	var url string
	if s.driveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/createSession", s.workbookId)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/workbook/createSession", s.driveId, s.workbookId)
	}
	body := CreateSessionRequest{
		PersistChanges: persistChanges,
	}
	bodyJSON, err := jsoniter.Marshal(body)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyJSON))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.accessToken))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(bodyJSON)))
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("Error sending request to create excel session id: %w", err)
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("Error reading response body from create excel session id: %w", err)
	}

	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		var errRes ErrorResponse
		err := jsoniter.Unmarshal(responseBody, &errRes)
		if err != nil {
			return fmt.Errorf("Error unmarshalling: %w", err)
		}
		return WrapWorkbookApiError(resp.StatusCode, errRes.Error.Msg)
	}

	var response CreateSessionResponse
	err = jsoniter.Unmarshal(responseBody, &response)
	if err != nil {
		return err
	}

	s.sessionId = response.Id
	return nil
}

func (s *MicrosoftExcelService) CloseSession() error {
	s.logger.Debug("Closing session")
	var url string
	if s.driveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/closeSession", s.workbookId)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/workbook/closeSession", s.driveId, s.workbookId)
	}
	body := CloseSessionRequest{}
	bodyJSON, err := jsoniter.Marshal(body)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyJSON))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.accessToken))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("workbook-session-id", s.sessionId)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("Error sending request to close excel session: %w", err)
	}
	defer resp.Body.Close()
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("Error reading response body when close session: %w", err)
	}

	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		var errRes ErrorResponse
		err := jsoniter.Unmarshal(responseBody, &errRes)
		if err != nil {
			return fmt.Errorf("Error unmarshalling: %w", err)
		}
		return WrapWorkbookApiError(resp.StatusCode, errRes.Error.Msg)
	}

	return nil
}

func (s *MicrosoftExcelService) GetWorksheetInfo() error {
	s.logger.Debug("Getting worksheet info")
	var url string
	if s.driveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/worksheets/%s", s.workbookId, s.worksheetId)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/workbook/worksheets/%s", s.driveId, s.workbookId, s.worksheetId)
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.accessToken))
	req.Header.Set("workbook-session-id", s.sessionId)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		var errRes ErrorResponse
		err := jsoniter.Unmarshal(responseBody, &errRes)
		if err != nil {
			return fmt.Errorf("Error unmarshalling: %w", err)
		}
		return WrapWorksheetApiError(resp.StatusCode, errRes.Error.Msg)
	}

	var response GetWorksheetInfoResponse
	err = jsoniter.Unmarshal(responseBody, &response)
	if err != nil {
		return err
	}
	log.Debug("Worksheet name: ", response.Name)

	s.worksheetName = response.Name
	return nil
}

func (s *MicrosoftExcelService) DownloadXlsxFile() error {
	s.logger.Debug("Downloading xlsx file")

	filePath, err := util.GenerateTempFileName(s.workbookId, "xlsx", false)
	if err != nil {
		return err
	}

	var url string
	if s.driveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/content", s.workbookId)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/content", s.driveId, s.workbookId)
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.accessToken))
	req.Header.Set("workbook-session-id", s.sessionId)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// handle error
	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		var errRes ErrorResponse
		responseBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		err = jsoniter.Unmarshal(responseBody, &errRes)
		if err != nil {
			return fmt.Errorf("Error unmarshalling: %w", err)
		}
		return WrapWorksheetApiError(resp.StatusCode, errRes.Error.Msg)
	}

	// Save downloaded file
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return err
	}

	s.workbookFilePath = filePath

	return nil
}

func (source *MicrosoftExcelService) Setup(ctx context.Context) error {
	return nil
}

func (source *MicrosoftExcelService) Download(ctx context.Context) error {
	if err := source.CreateSessionId(true); err != nil {
		source.logger.Error("Error creating session id", err)
		return err
	}

	group, _ := errgroup.WithContext(ctx)
	group.Go(func() error {
		if err := source.GetWorksheetInfo(); err != nil {
			source.logger.Error("Error getting worksheet info", err)
			return err
		}
		return nil
	})
	group.Go(source.DownloadXlsxFile)
	err := group.Wait()
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(
		ctx,
		"./excel/do-all",
		"--xlsxFile", source.workbookFilePath,
		"--xlsxSheetName", source.worksheetName,
		"--driveId", source.driveId,
		"--workbookId", source.workbookId,
		"--sheetId", source.worksheetId,
		"--sheetName", source.worksheetName,
		// "--sheetIndex", fmt.Sprintf("%d", s.sheetIndex+1),
		"--accessToken", source.accessToken,
		"--dataSourceId", source.dataSourceId,
		"--syncVersion", fmt.Sprintf("%d", source.syncVersion),
		"--timeZone", source.timezone,
		"--s3Endpoint", config.AppConfig.S3Endpoint,
		"--s3Region", config.AppConfig.S3Region,
		"--s3Bucket", config.AppConfig.S3DiffDataBucket,
		"--s3AccessKey", config.AppConfig.S3AccessKey,
		"--s3SecretKey", config.AppConfig.S3SecretKey,
		"--s3Ssl", strconv.FormatBool(config.AppConfig.S3Ssl),
		// "--debug", debugParam,
	)

	outputWriter := source.logger.WriterLevel(log.InfoLevel)
	defer outputWriter.Close()
	var stderr bytes.Buffer
	cmd.Stdout = outputWriter
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Debug("Error when running download script: ", err)
		// check external error
		var downloadError DownloadError
		marshalErr := jsoniter.Unmarshal(stderr.Bytes(), &downloadError)
		if marshalErr != nil {
			return fmt.Errorf("Cannot read error from stderr: %w", err)
		}
		log.Debug("Download error: ", downloadError.Msg)
		if downloadError.IsExternal {
			return e.NewExternalErrorWithDescription(downloadError.Code, downloadError.Msg, "External error when running ingest script")
		}

		return err
	}

	return nil
}

func (source *MicrosoftExcelService) Close(ctx context.Context) error {
	go func() {
		if err := source.CloseSession(); err != nil {
			source.logger.Warn("Error close session", err)
		}
	}()
	go util.DeleteFile(source.workbookFilePath)
	return nil
}
