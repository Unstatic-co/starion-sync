package util

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"crypto/rand"
	"crypto/sha256"
)

func GetMD5Hash(text string) string {
	hash := md5.Sum([]byte(text))
	return hex.EncodeToString(hash[:])
}

func GenerateTempFileName(prefix string) string {
	randomBytes := make([]byte, 16)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(err)
	}

	timestamp := time.Now().UnixNano()
	hashBytes := sha256.Sum256(append(randomBytes, []byte(fmt.Sprintf("%d", timestamp))...))
	filename := fmt.Sprintf("%s_%s.tmp", prefix, hex.EncodeToString(hashBytes[:8]))
	return filepath.Join(os.TempDir(), filename)
}

func CreateTempFileWithContent(filePrefix string, content string) (string, error) {
	tempFilePath := GenerateTempFileName(filePrefix)
	tempFile, err := ioutil.TempFile("", tempFilePath)
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
