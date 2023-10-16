package excel

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io/ioutil"
	"metadata/pkg/config"
	"metadata/pkg/database"
	"metadata/util"
	"net/http"
	"os"
	"os/exec"
	"strconv"

	jsoniter "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/sync/errgroup"
)

type RowPosDocument struct {
	ID  string `bson:"_id"`
	Pos int    `bson:"pos"`
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

	driveInfo interface{}

	// temp
	idColFilePath    string
	metadataFilePath string

	// db
	dbPath string

	// client
	httpClient http.Client

	// loger
	logger *log.Entry

	// result
	RowCount int `json:"rowCount"`
}

func New(params MicrosoftExcelServiceInitParams) *MicrosoftExcelService {
	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
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
		dbPath:        config.AppConfig.DbPath,
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
	req.Header.Set("workbook-session-id", s.sessionId)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	var response CreateSessionResponse
	err = jsoniter.Unmarshal(responseBody, &response)
	if err != nil {
		return err
	}
	log.Debug("Session id: ", response.Id)

	s.sessionId = response.Id
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
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
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

func (s *MicrosoftExcelService) UpdateMetadata(ctx context.Context) error {
	log.Debug("Start updating metadata for %s", s.dataSourceId)

	if err := s.CreateSessionId(true); err != nil {
		s.logger.Error("Error creating session id", err)
		return err
	}
	if err := s.GetWorksheetInfo(); err != nil {
		s.logger.Error("Error getting worksheet info", err)
		return err
	}

	// create temp file
	idColFilePath, err := util.CreateTempFile("excel_id_col")
	if err != nil {
		return err
	}
	s.idColFilePath = idColFilePath
	metaDataFilePath, err := util.CreateTempFile("excel_metadata")
	if err != nil {
		return err
	}
	s.metadataFilePath = metaDataFilePath

	// download metadata
	s.DownloadMetadata(ctx)

	return nil
}

func (s *MicrosoftExcelService) DownloadMetadata(ctx context.Context) error {
	var debugParam string
	if config.AppConfig.IsProduction {
		debugParam = "off"
	} else {
		debugParam = "on"
	}
	cmd := exec.CommandContext(
		ctx,
		"bash",
		"./download-metadata-excel.sh",
		"--driveId", s.driveId,
		"--workbookId", s.workbookId,
		"--worksheetId", s.worksheetId,
		"--worksheetName", s.worksheetName,
		"--accessToken", s.accessToken,
		"--sessionId", s.sessionId,
		"--dataSourceId", s.dataSourceId,
		"--idColFile", s.idColFilePath,
		"--metadataFile", s.metadataFilePath,
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

	eg, ctx := errgroup.WithContext(ctx)

	eg.Go(func() error {
		return s.UploadCommonMetadata(ctx)
	})
	eg.Go(func() error {
		return s.UploadRowMetadata(ctx)
	})

	if err := eg.Wait(); err != nil {
		log.Errorf("Error uploading metadata: %s", err.Error())
	}

	return nil
}

func (s *MicrosoftExcelService) UploadCommonMetadata(ctx context.Context) error {
	var rowCount int

	// read file
	file, err := os.Open(s.metadataFilePath)
	if err != nil {
		return err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	count := 0
	for scanner.Scan() {
		line := scanner.Text()
		if count == 0 {
			rowCount, err = strconv.Atoi(line)
			if err != nil {
				log.Errorf("Error converting row count: %s", err.Error())
				return err
			}
		}
		count++
	}
	if err := scanner.Err(); err != nil {
		log.Errorf("Error reading file %s", err.Error())
		return err
	}

	client := database.Client
	collection := database.GetCollection(client, database.ExcelCommonCollection)
	_, err = collection.UpdateOne(ctx, bson.M{"dataSourceId": s.dataSourceId}, bson.M{
		"$setOnInsert": bson.M{
			"dataSourceId": s.dataSourceId,
		},
		"$set": bson.M{
			"rowCount": rowCount,
		},
	}, options.Update().SetUpsert(true))
	if err != nil {
		log.Errorf("Error upsert excel common document: %s", err.Error())
		return err
	}

	s.RowCount = rowCount

	return nil
}

func (s *MicrosoftExcelService) UploadRowMetadata(ctx context.Context) error {
	client := database.Client
	collection := database.GetCollection(client, database.ExcelRowPosCollection)

	// get old row pos
	cursor, err := collection.Find(ctx, bson.M{"dataSourceId": s.dataSourceId}, options.Find().SetProjection(bson.M{"_id": 1, "pos": 1}))
	if err != nil {
		log.Errorf("Error getting old row pos: %s", err.Error())
		return err
	}
	defer cursor.Close(ctx)
	oldRowPos := make(map[string]int)
	for cursor.Next(ctx) {
		var doc RowPosDocument
		err := cursor.Decode(&doc)
		if err != nil {
			log.Errorf("Error decoding row pos document: %s", err.Error())
		}
		oldRowPos[doc.ID] = doc.Pos
	}
	if err := cursor.Err(); err != nil {
		log.Errorf("Error iterating cursor: %s", err.Error())
	}

	// read file
	file, err := os.Open(s.idColFilePath)
	if err != nil {
		return err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)

	eg, ctx := errgroup.WithContext(ctx)
	count := 0
	updateCount := 0
	const batchSize = 1000
	var bulkWrite *[]mongo.WriteModel
	bulkWrite = new([]mongo.WriteModel)

	for scanner.Scan() {
		rowId := scanner.Text()
		if count != 0 && util.IsValidUUID(rowId) {
			if oldRowPos[rowId] != count {
				*bulkWrite = append(*bulkWrite, mongo.NewUpdateOneModel().SetFilter(bson.M{"_id": rowId}).SetUpdate(bson.M{
					"$setOnInsert": bson.M{
						"_id":          rowId,
						"dataSourceId": s.dataSourceId,
					},
					"$set": bson.M{
						"pos": count,
					},
				}).SetUpsert(true))
				if len(*bulkWrite) == batchSize {
					bulkWriteCopy := *bulkWrite
					eg.Go(func() error {
						return UpsertBatchExcelRowPos(ctx, collection, bulkWriteCopy)
					})
					bulkWrite = new([]mongo.WriteModel)
				}
				updateCount++
			}
		}
		count++
	}
	if len(*bulkWrite) > 0 {
		eg.Go(func() error {
			bulkWriteCopy := *bulkWrite
			return UpsertBatchExcelRowPos(ctx, collection, bulkWriteCopy)
		})
	}

	if err := scanner.Err(); err != nil {
		log.Errorf("Error reading file %s", err.Error())
		return err
	}

	if err := eg.Wait(); err != nil {
		log.Errorf("Error uploading row metadata: %s", err.Error())
		return err
	}

	log.Debug("Update row pos count: ", updateCount)

	return nil
}

func UpsertBatchExcelRowPos(ctx context.Context, collection *mongo.Collection, bulkWrite []mongo.WriteModel) error {
	_, err := collection.BulkWrite(ctx, bulkWrite, options.BulkWrite().SetOrdered(false))
	if err != nil {
		log.Errorf("Error upsert batch excel row pos document: %s", err.Error())
		return err
	}
	return nil
}
