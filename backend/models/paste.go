package models

type Paste struct {
	ID          string `json:"id"`
	Text        string `json:"text,omitempty"`
	Protected   bool   `json:"protected"`
	TimeoutUnix int64  `json:"timeoutUnix"`
	Salt        string `json:"salt,omitempty"`
}

type CreatePasteRequest struct {
	Expiry      int    `json:"expiry" binding:"required,min=60,max=604800"`
	PassProtect bool   `json:"passProtect"`
	Pass        string `json:"pass"`
	PasteText   string `json:"pasteText" binding:"required"`
}

type GetPasteRequest struct {
	ID   string `json:"id" binding:"required,min=4"`
	Pass string `json:"pass"`
}
