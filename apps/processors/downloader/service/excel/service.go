package excel

import (
	"context"
	"os"
	"os/exec"
	"path"
	"time"

	log "github.com/sirupsen/logrus"
)

type MicrosoftExcelServiceInitParams struct {
	// info
	driveId       string `json:"driveId"`
	workbookId    string `json:"workbookId"`
	worksheetId   string `json:"worksheetId"`
	worksheetName string `json:"worksheetName"`

	// auth
	accessToken string `json:"accessToken"`
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

	driveInfo interface{}

	// loger
	logger *log.Entry
}

func New(params MicrosoftExcelServiceInitParams) *MicrosoftExcelService {
	logger := log.New()
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"workbookId":  params.workbookId,
		"worksheetId": params.worksheetId,
	})
	return &MicrosoftExcelService{
		driveId:       params.driveId,
		workbookId:    params.workbookId,
		worksheetId:   params.worksheetId,
		worksheetName: params.worksheetName,
		accessToken:   params.accessToken,
		logger:        loggerEntry,
	}
}

func (source *MicrosoftExcelService) GetWorkbookInfo(ctx context.Context) error {
	return nil
}

func (source *MicrosoftExcelService) Download(ctx context.Context) error {
	execPath, _ := os.Executable()
	ctx, _ = context.WithTimeout(ctx, 15*time.Minute)
	cmd := exec.CommandContext(
		ctx,
		"bash",
		path.Join(path.Dir(execPath), "scripts", "download-excel.sh"),
	)

	outputWriter := source.logger.WriterLevel(log.InfoLevel)
	errorWriter := source.logger.WriterLevel(log.ErrorLevel)
	defer outputWriter.Close()
	defer errorWriter.Close()

	if err := cmd.Run(); err != nil {
		return err
	}

	return nil
}
