package service

type DownloaderService interface {
	Setup()
	Download()
	Close()
}
