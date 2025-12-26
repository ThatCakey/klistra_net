package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/esaiaswestberg/klistra-go/api"
	"github.com/esaiaswestberg/klistra-go/models"
	"github.com/esaiaswestberg/klistra-go/services"
)

func (s *Server) CreatePaste(c *gin.Context) {
	var req api.CreatePasteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id, err := services.GenerateID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID"})
		return
	}

	var filesJSON string
	if req.Files != nil && len(*req.Files) > 0 {
		fj, _ := json.Marshal(req.Files)
		filesJSON = string(fj)
	}

	passHash := ""
	if req.PassHash != nil {
		passHash = *req.PassHash
	}

	salt := ""
	if req.Salt != nil {
		salt = *req.Salt
	}

	timeoutUnix := time.Now().Add(time.Duration(req.Expiry) * time.Second).Unix()
	paste := models.Paste{
		ID:          id,
		Text:        req.PasteText,
		Files:       filesJSON,
		Language:    getStringValue(req.Language),
		Protected:   req.PassProtect,
		PassHash:    passHash,
		TimeoutUnix: timeoutUnix,
		Salt:        salt,
	}
	
	pasteJSON, _ := json.Marshal(paste)
	
	err = services.Set(id, string(pasteJSON), time.Duration(req.Expiry)*time.Second)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	session := sessions.Default(c)
	session.Set("createdPaste", id)
	session.Save()

	resp := api.Paste{
		Id:          &id,
		Protected:   &req.PassProtect,
		TimeoutUnix: &timeoutUnix,
		Text:        &req.PasteText,
		Files:       req.Files,
		Language:    req.Language,
		Salt:        &salt,
		MasterKey:   req.PassHash,
	}
	
	c.JSON(http.StatusCreated, resp)
}

func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (s *Server) GetPaste(c *gin.Context, id string, params api.GetPasteParams) {
	data, err := services.Get(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paste not found"})
		return
	}

	var paste models.Paste
	json.Unmarshal([]byte(data), &paste)

	token := ""
	if params.XPastePassword != nil {
		token = *params.XPastePassword
	}

	// Access control:
	// If protected, require token match.
	if paste.Protected && token != paste.PassHash {
		// Return metadata only (locked)
		c.JSON(http.StatusOK, api.Paste{
			Id:          &paste.ID,
			Protected:   &paste.Protected,
			TimeoutUnix: &paste.TimeoutUnix,
			Salt:        &paste.Salt,
			Language:    &paste.Language,
			Text:        nil,
			Files:       nil,
		})
		return
	}

	// Success - Return encrypted blobs
	var files []api.File
	if paste.Files != "" {
		_ = json.Unmarshal([]byte(paste.Files), &files)
	}

	var masterKey *string
	if !paste.Protected {
		masterKey = &paste.PassHash
	}

	c.JSON(http.StatusOK, api.Paste{
		Id:          &paste.ID,
		Protected:   &paste.Protected,
		TimeoutUnix: &paste.TimeoutUnix,
		Salt:        &paste.Salt,
		Language:    &paste.Language,
		Text:        &paste.Text,
		Files:       &files,
		MasterKey:   masterKey,
	})
}