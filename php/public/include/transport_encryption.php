<?php
class TransportEncryption
{
    // Encrypt function using the session key
    function encryptJSON($jsonData) {
        // Check if the session key is set
        if (!isset($_SESSION['session_transport_token'])) {
            error_log("Encryption key is not set in session.");
            return null;
        }

        $key = $_SESSION['session_transport_token']; // Use session key
        
        // Generate random IV
        $ivLen = openssl_cipher_iv_length('aes-256-cbc');
        $iv = openssl_random_pseudo_bytes($ivLen);

        $jsonStr = json_encode($jsonData);
        $encryptedData = openssl_encrypt($jsonStr, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

        // Prepend IV to encrypted data
        return base64_encode($iv . $encryptedData);
    }

    // Decrypt function using the session key
    function decryptJSON($encryptedBase64) {
        // Check if the session key is set
        if (!isset($_SESSION['session_transport_token'])) {
            error_log("Encryption key is not set in session.");
            return null;
        }
    
        $key = $_SESSION['session_transport_token']; // Use session key
        
        // Decrypt the base64-encoded string
        $data = base64_decode($encryptedBase64);
        
        $ivLen = openssl_cipher_iv_length('aes-256-cbc');
        
        if (strlen($data) < $ivLen) {
            return null;
        }
        
        $iv = substr($data, 0, $ivLen);
        $encryptedData = substr($data, $ivLen);
    
        $decryptedData = openssl_decrypt($encryptedData, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
    
        // Decode JSON string into an object
        return json_decode($decryptedData); 
    }
}