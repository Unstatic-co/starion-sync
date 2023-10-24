package util

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"crypto/rand"
	"crypto/sha256"

	jsoniter "github.com/json-iterator/go"
)

func HashFieldName(fieldName string) string {
	replacer := strings.NewReplacer("1", "a", "2", "b", "3", "c", "4", "d", "5", "e", "6", "f", "7", "g", "8", "h", "9", "i", "0", "j")
	return "f_" + replacer.Replace(GetMD5Hash(fieldName))
}

func GetMD5Hash(text string) string {
	hash := md5.Sum([]byte(text))
	return hex.EncodeToString(hash[:])
}

func GenerateTempFileName(prefix string, extension string) (string, error) {
	if extension == "" {
		extension = "tmp"
	}
	randomBytes := make([]byte, 16)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", err
	}

	timestamp := time.Now().UnixNano()
	hashBytes := sha256.Sum256(append(randomBytes, []byte(fmt.Sprintf("%d", timestamp))...))
	filename := fmt.Sprintf("%s_%s.%s", prefix, hex.EncodeToString(hashBytes[:8]), extension)
	return filepath.Join(os.TempDir(), filename), nil
}

func CreateTempFileWithContent(filePrefix string, content string) (string, error) {
	tempFilePath, err := GenerateTempFileName(filePrefix, "")
	if err != nil {
		return "", err
	}
	tempFile, err := os.CreateTemp("", tempFilePath)
	if err != nil {
		fmt.Println("Error creating temporary file:", err)
		return "", err
	}
	defer os.Remove(tempFile.Name()) // Remove the temporary file when the program exits
	defer tempFile.Close()

	_, err = tempFile.WriteString(content)
	if err != nil {
		fmt.Println("Error writing to temporary file:", err)
		return "", err
	}

	return tempFilePath, nil
}

func DeleteFile(filePath string) error {
	err := os.Remove(filePath)
	if err != nil {
		return err
	}
	return nil
}

func MarshalJsonFile(filePath string, v interface{}) error {
	externalErrContent, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("Cannot read file: %+v", err.Error())
	}
	err = jsoniter.Unmarshal(externalErrContent, &v)
	if err != nil {
		return fmt.Errorf("Cannot unmarshal json file: %+v", err.Error())
	}
	return nil
}

func ConvertS3URLToHost(inputURL string) (string, error) {
	s3URLRegex := regexp.MustCompile(`^s3://([^/]+)(:([0-9]+))?`)
	match := s3URLRegex.FindStringSubmatch(inputURL)

	if len(match) >= 2 {
		host := match[1]
		port := match[3]

		if port != "" {
			return fmt.Sprintf("%s:%s", host, port), nil
		}
		return host, nil
	}

	parsedURL, err := url.Parse(inputURL)
	if err != nil {
		return "", err
	}

	return parsedURL.Host, nil
}
