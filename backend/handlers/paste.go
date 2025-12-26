package handlers

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/esaiaswestberg/klistra-go/models"
	"github.com/esaiaswestberg/klistra-go/services"
)

func CreatePaste(c *gin.Context) {
	// Decrypt request manually since we need to bind JSON
	// The middleware might have decrypted it?
	// We need to check if we can bind.
	// Since I implemented middleware to replace Body, ShouldBindJSON should work.
	
	var req models.CreatePasteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Logic
	id, err := services.GenerateID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID"})
		return
	}

	// Encrypt Paste
	salt, _ := services.GenerateSalt()
	saltBase64 := base64.StdEncoding.EncodeToString(salt)

	passwordToUse := req.Pass
	if !req.PassProtect {
		passwordToUse = id
	}

	key := services.DeriveKey(passwordToUse, salt)
	encryptedText, err := services.Encrypt(req.PasteText, key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption failed"})
		return
	}

	timeoutUnix := time.Now().Add(time.Duration(req.Expiry) * time.Second).Unix()
	paste := models.Paste{
		ID:          id,
		Text:        encryptedText,
		Protected:   req.PassProtect,
		TimeoutUnix: timeoutUnix,
		Salt:        saltBase64,
	}

	// Store
	// DB stores JSON string of struct? Or individual columns?
	// services/db.go expects (key, value, duration).
	// Let's marshal paste to JSON.
	
	// Wait, db.go uses "data TEXT" column.
	// We can store the JSON representation of the paste struct.
	// But `models.Paste` has `Text` field which is now encrypted text.
	// That matches.
	
	pasteJSON, _ := json.Marshal(paste)
	
	err = services.Set(id, string(pasteJSON), time.Duration(req.Expiry)*time.Second)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Set Session
	session := sessions.Default(c)
	session.Set("createdPaste", id)
	session.Save()

	c.String(http.StatusCreated, id)
}

func GetPaste(c *gin.Context) {
	var req models.GetPasteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	data, err := services.Get(req.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paste not found"})
		return
	}

	var paste models.Paste
	json.Unmarshal([]byte(data), &paste)

	// Decrypt
	salt, _ := base64.StdEncoding.DecodeString(paste.Salt)
	passwordToUse := req.Pass
	// If protected and no pass provided?
	if paste.Protected && req.Pass == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password required"})
		return
	}
	if !paste.Protected {
		passwordToUse = req.ID
	}

	key := services.DeriveKey(passwordToUse, salt)
	decryptedText, err := services.Decrypt(paste.Text, key)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
		return
	}

	response := models.Paste{
		ID:          paste.ID,
		TimeoutUnix: paste.TimeoutUnix,
		Protected:   paste.Protected,
		Text:        decryptedText,
	}

	// Encrypt Response?
	// PHP did: $encrypted_response = $tEnc->encryptJSON(@$response);
	// We should do the same if we want to match security model (End-to-End ish).
	
	session := sessions.Default(c)
	transportKeyHex := session.Get("transport_key")
	if transportKeyHex != nil {
		transportKey, _ := hex.DecodeString(transportKeyHex.(string))
		encryptedResponse, err := services.EncryptJSON(response, transportKey)
		if err == nil {
			c.String(http.StatusOK, encryptedResponse)
			return
		}
	}

	// Fallback to plain JSON if transport encryption fails or not set?
	// Or maybe client expects encrypted string always.
	c.JSON(http.StatusOK, response)
}

func GetPasteStatus(c *gin.Context) {
	var req struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	data, err := services.Get(req.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paste not found"})
		return
	}

	var paste models.Paste
	json.Unmarshal([]byte(data), &paste)

	c.JSON(http.StatusOK, gin.H{
		"id":        paste.ID,
		"protected": paste.Protected,
	})
}
