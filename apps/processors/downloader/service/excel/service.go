package excel

import (
	"context"
	"os/exec"
	"time"

	log "github.com/sirupsen/logrus"
)

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
	SyncVersion  string `json:"syncVersion"`
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
	syncVersion  string

	driveInfo interface{}

	// loger
	logger *log.Entry
}

func New(params MicrosoftExcelServiceInitParams) *MicrosoftExcelService {
	logger := log.New()
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"workbookId":  params.WorkbookId,
		"worksheetId": params.WorksheetId,
	})
	return &MicrosoftExcelService{
		driveId:       params.DriveId,
		workbookId:    params.WorkbookId,
		worksheetId:   params.WorksheetId,
		worksheetName: params.WorksheetName,
		accessToken:   params.AccessToken,
		sessionId:     params.SessionId,
		dataSourceId:  params.DataSourceId,
		syncVersion:   params.SyncVersion,
		logger:        loggerEntry,
	}
}

func (source *MicrosoftExcelService) GetWorkbookInfo(ctx context.Context) error {
	return nil
}

func (source *MicrosoftExcelService) Download(ctx context.Context) error {
	timeoutCtx, _ := context.WithTimeout(ctx, 15*time.Minute)
	cmd := exec.CommandContext(
		timeoutCtx,
		"bash",
		"./scripts/download-excel.sh",
		"--driveId", source.driveId,
		"--workbookId", source.workbookId,
		"--worksheetId", source.worksheetId,
		"--worksheetName", source.worksheetName,
		"--accessToken", source.accessToken,
		"--sessionId", source.sessionId,
		"--dataSourceId", source.dataSourceId,
		"--syncVersion", source.syncVersion,
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
