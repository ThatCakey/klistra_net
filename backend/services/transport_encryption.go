package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
)

// EncryptJSON encrypts a JSON object using AES-256-CBC
func EncryptJSON(data interface{}, key []byte) (string, error) {
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// IV length must equal block size
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	// Pad data to block size
	padding := aes.BlockSize - len(jsonBytes)%aes.BlockSize
	padText := make([]byte, len(jsonBytes)+padding)
	copy(padText, jsonBytes)
	for i := len(jsonBytes); i < len(padText); i++ {
		padText[i] = byte(padding)
	}

	ciphertext := make([]byte, len(padText))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(ciphertext, padText)

	// Prepend IV to ciphertext
	finalData := append(iv, ciphertext...)
	return base64.StdEncoding.EncodeToString(finalData), nil
}

// DecryptJSON decrypts a base64 encoded string using AES-256-CBC and unmarshals it
func DecryptJSON(encryptedBase64 string, key []byte, v interface{}) error {
	data, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return err
	}

	if len(data) < aes.BlockSize {
		return errors.New("ciphertext too short")
	}

	iv := data[:aes.BlockSize]
	ciphertext := data[aes.BlockSize:]

	block, err := aes.NewCipher(key)
	if err != nil {
		return err
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	
	// Check if ciphertext is a multiple of the block size
	if len(ciphertext)%aes.BlockSize != 0 {
		return errors.New("ciphertext is not a multiple of the block size")
	}

	mode.CryptBlocks(ciphertext, ciphertext)

	// Unpad
	padding := int(ciphertext[len(ciphertext)-1])
	if padding > aes.BlockSize || padding == 0 {
		return errors.New("invalid padding")
	}
	// Check all padding bytes
	for i := len(ciphertext) - padding; i < len(ciphertext); i++ {
		if ciphertext[i] != byte(padding) {
			return errors.New("invalid padding")
		}
	}
	
	jsonData := ciphertext[:len(ciphertext)-padding]

	return json.Unmarshal(jsonData, v)
}
