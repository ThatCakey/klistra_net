package models

type Paste struct {
	ID          string `json:"id"`
	Text        string `json:"text,omitempty"`
	Files       string `json:"files,omitempty"` // Encrypted JSON array of file URLs
	Protected   bool   `json:"protected"`
	PassHash    string `json:"pass_hash,omitempty"`
	TimeoutUnix int64  `json:"timeoutUnix"`
	Salt        string `json:"salt,omitempty"`
}