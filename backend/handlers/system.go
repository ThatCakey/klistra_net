package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func GetToken(c *gin.Context) {
	session := sessions.Default(c)
	
	// Check for existing key
	// existingKey := session.Get("transport_key")
	// if existingKey != nil {
	// 	c.JSON(http.StatusOK, gin.H{"key": existingKey})
	// 	return
	// }

	// Generate new key (32 bytes for AES-256)
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate key"})
		return
	}

	keyHex := hex.EncodeToString(key)
	session.Set("transport_key", keyHex)
	session.Save()

	// Return the raw key bytes (as a string/array?) or hex?
	// JS script.js:
	// const keyString = await fetchKey();
	// const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyString), ...)
	// WAIT! PHP transport_encryption.php uses the key directly from session.
	// JS fetchKey() gets it from /api/token.
	// In PHP /api/token.php:
	/*
	session_start();
	if (!isset($_SESSION['session_transport_token'])) {
		$_SESSION['session_transport_token'] = bin2hex(openssl_random_pseudo_bytes(32));
	}
	echo json_encode(["key" => $_SESSION['session_transport_token']]);
	*/
	// So it sends the HEX string.
	// AND JS: new TextEncoder().encode(keyString) -> converts hex string to bytes of chars?
	// NO. if keyString is "abcd", bytes are [97, 98, 99, 100].
	// This means the key used for AES is the BYTES of the HEX STRING. (64 bytes long key?)
	// Or is the JS treating the string as raw bytes?
	
	// PHP:
	// openssl_encrypt(..., $key, ...)
	// If $key is hex string (64 chars), openssl might handle it.
	// But PHP generated it as: bin2hex(openssl_random_pseudo_bytes(32));
	// So $key IS a hex string.
	
	// JS:
	// importKey("raw", new TextEncoder().encode(keyString), ...)
	// This takes the utf-8 bytes of the hex string.
	// So effectively, the key is the 64-byte sequence of the hex characters.
	
	// Go: 
	// services/transport_encryption.go uses aes.NewCipher(key)
	// If we pass the []byte of the hex string, it's 64 bytes.
	// AES-256 requires 32 bytes.
	// AES-512? Go aes package supports 16, 24, 32 bytes.
	// So 64 bytes will fail.
	
	// Wait, does PHP's openssl_encrypt support 64 byte keys?
	// "aes-256-cbc" expects 32 bytes. If longer, it might be truncated or hashed?
	// OpenSSL CLI usually derives key from password. But here we pass $key directly.
	
	// Let's re-read PHP transport_encryption.php carefully.
	// $key = $_SESSION['session_transport_token'];
	// $key was set to bin2hex(...) -> 64 chars.
	
	// If PHP uses a 64-byte key for AES-256, it's weird.
	// Unless... openssl_encrypt treats the key param as a passphrase if not binary?
	// No, standard behavior for library calls usually expects correct length.
	
	// Let's look at JS again.
	// new TextEncoder().encode(keyString) -> Uint8Array of 64 bytes.
	// crypto.subtle.importKey("raw", ..., {name: "AES-CBC"}, ...)
	// AES-CBC importKey usually expects 16, 24, 32 bytes.
	// 64 bytes should fail?
	
	// Maybe PHP generates 16 bytes -> 32 hex chars?
	// bin2hex(openssl_random_pseudo_bytes(32)) -> 64 chars.
	
	// I might need to adjust the Go implementation to match EXACTLY what JS expects/does,
	// OR fix JS to be standard.
	// Since I'm "re-implementing", I can fix the logic to be sane (32 random bytes),
	// AS LONG AS I update the client code too.
	// But the user asked to "re-implement this entire project in Go and React".
	// The React app is being built from scratch (mostly), so I can control the client logic.
	
	// So, let's stick to standard 32-byte (256-bit) key.
	// Server generates 32 random bytes.
	// Sends them as Base64 (easier) or Hex?
	// JS decodes Base64/Hex to raw bytes.
	
	// Let's make it standard:
	// 1. Server gen 32 bytes.
	// 2. Session stores 32 bytes (or hex of it).
	// 3. API sends Hex of it.
	// 4. JS parses Hex to Uint8Array (NOT TextEncoder).
	
	// I will use Hex for transmission.
	
	c.JSON(http.StatusOK, gin.H{"key": keyHex})
}

func GetSession(c *gin.Context) {
	// Returns the paste ID from session if any
	session := sessions.Default(c)
	pasteID := session.Get("createdPaste")
	if pasteID != nil {
		c.String(http.StatusOK, pasteID.(string))
	} else {
		// Return empty or 404? PHP returned string (empty or id)
		c.String(http.StatusOK, "")
	}
}
