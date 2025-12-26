package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/chacha20poly1305"
)

const (
	SaltBytes   = 16 // SODIUM_CRYPTO_PWHASH_SALTBYTES
	KeyBytes    = 32 // SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES
	NonceBytes  = 24 // SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES
	OpsLimit    = 3  // Stronger than interactive (2)
	MemLimit    = 64 * 1024 // 64MiB
	Parallelism = 4 // Modern CPUs
)

func DeriveKey(password string, salt []byte) []byte {
	return argon2.IDKey([]byte(password), salt, OpsLimit, MemLimit, Parallelism, KeyBytes)
}

func Encrypt(data string, key []byte) (string, error) {
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, NonceBytes)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	encrypted := aead.Seal(nonce, nonce, []byte(data), nil)
	return base64.StdEncoding.EncodeToString(encrypted), nil
}

func Decrypt(dataBase64 string, key []byte) (string, error) {
	decoded, err := base64.StdEncoding.DecodeString(dataBase64)
	if err != nil {
		return "", err
	}

	if len(decoded) < NonceBytes {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := decoded[:NonceBytes], decoded[NonceBytes:]

	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return "", err
	}

	decrypted, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(decrypted), nil
}

func GenerateSalt() ([]byte, error) {
	salt := make([]byte, SaltBytes)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}
	return salt, nil
}
