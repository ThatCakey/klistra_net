<?php
class Encryption
{
    // Derive a secure key from a password and salt using Argon2id
    public static function deriveKey($password, $salt)
    {
        // Ops limit and mem limit for interactive use (adjust if needed for server load)
        return sodium_crypto_pwhash(
            SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES,
            $password,
            $salt,
            SODIUM_CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE,
            SODIUM_CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE,
            SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13
        );
    }

    public function encrypt($data, $key)
    {
        $nonce = random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
        $encrypted = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
            $data,
            '',
            $nonce,
            $key
        );
        
        // Return Nonce + Ciphertext (Base64 encoded)
        return base64_encode($nonce . $encrypted);
    }

    public function decrypt($data, $key)
    {
        $decoded = base64_decode($data);
        $nonceLen = SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES;
        
        if (strlen($decoded) < $nonceLen) {
            return false;
        }

        $nonce = substr($decoded, 0, $nonceLen);
        $ciphertext = substr($decoded, $nonceLen);

        try {
            $decrypted = sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
                $ciphertext,
                '',
                $nonce,
                $key
            );
            return $decrypted;
        } catch (SodiumException $e) {
            return false;
        }
    }
}