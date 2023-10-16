package excel

type CreateSessionRequest struct {
	PersistChanges bool `json:"persistChanges"`
}

type CreateSessionResponse struct {
	PersistChanges bool   `json:"persistChanges"`
	Id             string `json:"id"`
}

type GetWorksheetInfoResponse struct {
	Id         string `json:"id"`
	Name       string `json:"name"`
	Position   int    `json:"position"`
	Visibility string `json:"visibility"`
}
