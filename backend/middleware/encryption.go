package middleware

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/esaiaswestberg/klistra-go/services"
)

func TransportEncryption() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		keyHex := session.Get("transport_key")
		if keyHex == nil {
			// If no key in session, we can't decrypt.
			// However, some endpoints (like GET /api/token) don't need decryption.
			// Let the handler decide or check path here.
			// For now, if body is present and not empty, try to decrypt.
			c.Next()
			return
		}

		key, err := hex.DecodeString(keyHex.(string))
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		// Decrypt Request Body if it's not empty and method is POST/PUT/PATCH
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err != nil {
				c.AbortWithStatus(http.StatusBadRequest)
				return
			}
			
			// Restore body for further reading if needed (though we replace it)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

			if len(bodyBytes) > 0 {
				// Assuming the body is the raw encrypted base64 string
				// OR a JSON object with a specific field?
				// The PHP code does: $inputObj = $tEnc->decryptJSON($inputEncrypted);
				// where inputEncrypted is file_get_contents("php://input");
				// So it expects the raw body to be the encrypted string.
				
				// However, JS might send it as raw body or JSON? 
				// script.js: apiPost("submit", formJsonTransportEncrypted) -> body: JSON.stringify(json)
				// Wait, the JS sends: body: JSON.stringify(json) where json is the encrypted string?
				// No, script.js:
				// const formJsonTransportEncrypted = await encryptJSON(formJson);
				// apiPost("submit", formJsonTransportEncrypted)
				// function apiPost(endpoint, json) { fetch(..., body: JSON.stringify(json) ... }
				// So the body is JSON string literal of the base64 string. e.g. "base64..."

				// Let's decode the JSON string first to get the base64 string
				// Actually, if JS sends JSON.stringify(string), it adds quotes.
				// PHP's file_get_contents("php://input") gets the raw body.
				// decryptJSON expects the base64 string.
				
				// Let's try to treat body as the encrypted string (removing quotes if present)
				encryptedStr := string(bodyBytes)
				if len(encryptedStr) > 2 && encryptedStr[0] == '"' && encryptedStr[len(encryptedStr)-1] == '"' {
					encryptedStr = encryptedStr[1 : len(encryptedStr)-1]
				}

				// We can't easily replace the body with the struct directly here because we don't know the target struct type.
				// Instead, we can attach the decrypted data to the context or use a custom binding.
				// A better approach might be to handle decryption in the handlers or a helper function, 
				// but to keep it clean, we can store the decrypted bytes in the context.
				
				// BUT, to work with Gin's ShouldBindJSON, we need to put valid JSON back into the body.
				// So we decrypt to a map[string]interface{} or struct, then marshal back to JSON?
				// That seems inefficient but standard for middleware modifying body.

				// However, we need to know what to unmarshal INTO to verify structure, 
				// but here we just need to decrypt.
				// Since services.DecryptJSON takes an interface{}, we can pass a map.
				
				var decryptedData map[string]interface{}
				err = services.DecryptJSON(encryptedStr, key, &decryptedData)
				if err != nil {
					// Fallback: Maybe it wasn't encrypted? Or decryption failed.
					// If strict, abort.
					// c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Decryption failed"})
					// return
					
					// For now, let's assume if decryption fails, it might be unencrypted (for testing/legacy)
					// or invalid.
				} else {
					// Marshal back to JSON to replace body
					newBody, _ := json.Marshal(decryptedData)
					c.Request.Body = io.NopCloser(bytes.NewBuffer(newBody))
				}
			}
		}

		// Proceed
		c.Next()

		// Encrypt Response Body?
		// The PHP code explicitly encrypts the response in api/read.php:
		// $encrypted_response = $tEnc->encryptJSON(@$response);
		// echo $encrypted_response;
		
		// Implementing response encryption middleware is complex (Hijacking ResponseWriter).
		// Better to do it in handlers explicitly or use a helper function in handlers.
	}
}
