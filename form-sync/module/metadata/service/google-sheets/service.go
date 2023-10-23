package google_sheets

import (
	"bufio"
	"context"
	"metadata/pkg/config"
	"metadata/pkg/database"
	"metadata/util"
	"net/url"
	"os"
	"os/exec"
	"strconv"

	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/sync/errgroup"

	"golang.org/x/oauth2"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

type RowPosDocument struct {
	ID  string `bson:"_id"`
	Pos int    `bson:"pos"`
}

type GoogleSheetsServiceInitParams struct {
	// info
	SpreadSheetId string `json:"spreadsheetId"`
	SheetId       string `json:"sheetId"`

	// auth
	AccessToken string `json:"accessToken"`

	DataSourceId string `json:"dataSourceId"`
}

type GoogleSheetsService struct {
	// info
	syncflowId    string
	spreadsheetId string
	sheetId       string

	// auth
	accessToken string

	// data
	dataSourceId string

	// resource
	downloadUrl string

	// temp
	idColFilePath    string
	metadataFilePath string

	// loger
	logger *log.Entry

	// result
	RowCount int `json:"rowCount"`
}

func New(params GoogleSheetsServiceInitParams) *GoogleSheetsService {
	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"spreadsheetId": params.SpreadSheetId,
		"dataSourceId":  params.DataSourceId,
	})

	// client

	return &GoogleSheetsService{
		spreadsheetId: params.SpreadSheetId,
		sheetId:       params.SheetId,
		accessToken:   params.AccessToken,
		dataSourceId:  params.DataSourceId,
		logger:        loggerEntry,
	}
}

func (s *GoogleSheetsService) UpdateMetadata(ctx context.Context) error {
	log.Debug("Start updating metadata for %s", s.dataSourceId)

	if err := s.GetDownloadUrl(ctx); err != nil {
		s.logger.Error("Error getting download url", err)
		return err
	}

	// create temp file
	idColFilePath, err := util.CreateTempFile("id_col")
	if err != nil {
		return err
	}
	s.idColFilePath = idColFilePath
	metaDataFilePath, err := util.CreateTempFile("metadata")
	if err != nil {
		return err
	}
	s.metadataFilePath = metaDataFilePath

	// download metadata
	s.DownloadMetadata(ctx)

	return nil
}

func (s *GoogleSheetsService) DownloadMetadata(ctx context.Context) error {
	var debugParam string
	if config.AppConfig.IsProduction {
		debugParam = "off"
	} else {
		debugParam = "on"
	}
	cmd := exec.CommandContext(
		ctx,
		"bash",
		"./download-metadata-google-sheets.sh",
		"--spreadsheetId", s.spreadsheetId,
		"--sheetId", s.sheetId,
		"--accessToken", s.accessToken,
		"--downloadUrl", s.downloadUrl,
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

func (s *GoogleSheetsService) UploadCommonMetadata(ctx context.Context) error {
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
	collection := database.GetCollection(client, database.GoogleSheetsCommonCollection)
	_, err = collection.UpdateOne(ctx, bson.M{"dataSourceId": s.dataSourceId}, bson.M{
		"$setOnInsert": bson.M{
			"dataSourceId": s.dataSourceId,
		},
		"$set": bson.M{
			"rowCount": rowCount,
		},
	}, options.Update().SetUpsert(true))
	if err != nil {
		log.Errorf("Error upsert google sheets common document: %s", err.Error())
		return err
	}

	s.RowCount = rowCount

	return nil
}

func (s *GoogleSheetsService) UploadRowMetadata(ctx context.Context) error {
	client := database.Client
	collection := database.GetCollection(client, database.GoogleSheetsRowPosCollection)

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
						return UpsertBatch(ctx, collection, bulkWriteCopy)
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
			return UpsertBatch(ctx, collection, bulkWriteCopy)
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

func (s *GoogleSheetsService) GetDownloadUrl(ctx context.Context) error {
	token := oauth2.Token{
		AccessToken: s.accessToken,
		// Expiry:      time.Now().Add(-30 * time.Minute),
	}
	tokenSource := oauth2.StaticTokenSource(&token)

	driveService, err := drive.NewService(ctx, option.WithTokenSource(tokenSource))
	if err != nil {
		return err
	}

	driveFile, err := driveService.Files.Get(s.spreadsheetId).Fields("version", "exportLinks").Do()
	if err != nil {
		return err
	}
	link, err := url.Parse(driveFile.ExportLinks["text/csv"])
	query := link.Query()
	query.Set("gid", s.sheetId)
	link.RawQuery = query.Encode()
	s.downloadUrl = link.String()

	s.logger.Debug("Download url: ", s.downloadUrl)

	return nil
}

func UpsertBatch(ctx context.Context, collection *mongo.Collection, bulkWrite []mongo.WriteModel) error {
	_, err := collection.BulkWrite(ctx, bulkWrite, options.BulkWrite().SetOrdered(false))
	if err != nil {
		log.Errorf("Error upsert batch excel row pos document: %s", err.Error())
		return err
	}
	return nil
}
