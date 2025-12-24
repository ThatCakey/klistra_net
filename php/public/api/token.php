<?php
// Start or resume the session
session_start();
header('Content-type: application/json');

// Check if the session variable 'session_transport_token' is already set
if (isset($_SESSION['session_transport_token'])) {
    // Return the existing token
    echo '{"key":"' . $_SESSION['session_transport_token'] . '"}';
} else {
    // Generate a new secure token (32 chars hex = 16 bytes entropy)
    // Adjust length if JS expects specific length, but JS uses it as raw key material?
    // JS: crypto.subtle.importKey("raw", new TextEncoder().encode(keyString)...)
    // So JS treats the *string bytes* as the key.
    // Let's keep it alphanumeric to be safe with JSON, but generated securely.
    
    $newToken = bin2hex(random_bytes(16));
    
    // Store the token in the session
    $_SESSION['session_transport_token'] = $newToken;
    
    // Return the new token
    echo '{"key":"' . $newToken . '"}';
}
?>