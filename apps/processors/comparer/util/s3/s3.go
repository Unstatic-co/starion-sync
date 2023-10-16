package s3

import (
	"bytes"
	"comparer/pkg/config"
	"fmt"
	"io"

	// "net/http"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	log "github.com/hiyali/logli"
)

const (
	S3_DEFAULT_ACL = "private"
)

type S3HandlerConfig struct {
	Endpoint  string
	Region    string
	Bucket    string
	AccessKey string
	SecretKey string
	SSl       bool
}

type S3Handler struct {
	Session *session.Session
	Bucket  string
}

func NewHandler(bucket string) (*S3Handler, error) {
	sess, err := session.NewSession(&aws.Config{
		Endpoint:    aws.String(config.AppConfig.S3Endpoint),
		Region:      aws.String(config.AppConfig.S3Region),
		DisableSSL:  aws.Bool(config.AppConfig.S3Ssl),
		Credentials: credentials.NewStaticCredentials(config.AppConfig.S3AccessKey, config.AppConfig.S3SecretKey, ""),
	})
	if err != nil {
		return nil, err
	}
	handler := S3Handler{
		Session: sess,
		Bucket:  bucket,
	}
	return &handler, nil
}

func NewHandlerWithConfig(config *S3HandlerConfig) (*S3Handler, error) {
	fmt.Println("NewHandlerWithConfig", config)
	sess, err := session.NewSession(&aws.Config{
		Endpoint:         aws.String(config.Endpoint),
		Region:           aws.String(config.Region),
		Credentials:      credentials.NewStaticCredentials(config.AccessKey, config.SecretKey, ""),
		S3ForcePathStyle: aws.Bool(true),
		DisableSSL:       aws.Bool(config.SSl == false),
	})
	if err != nil {
		return nil, err
	}
	handler := S3Handler{
		Session: sess,
		Bucket:  config.Bucket,
	}
	return &handler, nil
}

func (h S3Handler) UploadFile(key string, filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		log.FatalF("os.Open - filename: %s, err: %v", filename, err)
	}
	defer file.Close()

	// buffer := []byte(body)

	_, err = s3.New(h.Session).PutObject(&s3.PutObjectInput{
		Bucket: aws.String(h.Bucket),
		Key:    aws.String(key),
		ACL:    aws.String(S3_DEFAULT_ACL),
		Body:   file, // bytes.NewReader(buffer),
		// ContentDisposition: aws.String("attachment"),
	})

	return err
}

func (h S3Handler) UploadFileWithBytes(key string, data []byte) error {
	_, err := s3.New(h.Session).PutObject(&s3.PutObjectInput{
		Bucket: aws.String(h.Bucket),
		Key:    aws.String(key),
		ACL:    aws.String(S3_DEFAULT_ACL),
		Body:   bytes.NewReader(data),
		// ContentDisposition: aws.String("attachment"),
	})

	return err
}

func (h S3Handler) ReadFile(key string) (string, error) {
	results, err := s3.New(h.Session).GetObject(&s3.GetObjectInput{
		Bucket: aws.String(h.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return "", err
	}
	defer results.Body.Close()

	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, results.Body); err != nil {
		return "", err
	}
	return string(buf.Bytes()), nil
}

func (h S3Handler) ReadFileByte(key string) ([]byte, error) {
	results, err := s3.New(h.Session).GetObject(&s3.GetObjectInput{
		Bucket: aws.String(h.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	defer results.Body.Close()

	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, results.Body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
