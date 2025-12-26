# Klistra.nu

**Klistra.nu** is a secure, encrypted, and ephemeral pastebin platform designed to share sensitive text with peace of mind. Built with a focus on privacy and security, it ensures that your data is encrypted and stored securely.

## ✨ Features

- **🔐 Strong Encryption:** Text pastes are encrypted using `AES-256-GCM`.
- **📁 Multi-File Support:** Securely share multiple files alongside your text.
- **🛡️ Client-Side File Encryption:** Files are encrypted in your browser using `AES-256-GCM` before upload, ensuring zero-knowledge storage.
- **⚛️ Post-Quantum Ready:** Uses 256-bit symmetric keys and memory-hard key derivation to stay secure in the quantum era.
- **🛡️ Password Protection:** Optional password protection for your pastes.
- **⏳ Automatic Expiry:** Set a validity period (from 1 minute to 1 week). Pastes are automatically deleted after expiry.
- **🌓 Dark & Light Mode:** A modern, responsive UI built with React and Tailwind CSS.
- **⚡ High Performance:** Powered by a Go backend and SQLite for efficient storage.

...

## 🔒 Security Architecture

Klistra.nu implements a multi-layered security approach:

1.  **Transport Layer:** Standard HTTPS.
2.  **Client-Side Encryption (Text & Files):** 
    -   All encryption happens locally in the browser using the **Web Crypto API**.
    -   **Algorithm:** `AES-256-GCM`.
3.  **Key Management:**
    -   **Password Protected (Zero-Knowledge):** Keys are derived from your password using **Argon2id** (WASM). Only a non-reversible access hash is sent to the server for authentication. The server never sees your password or the decryption key.
    -   **Public Link:** For unprotected pastes, a random master key is generated client-side and stored encrypted on the server. The server returns this key alongside the data when the link is accessed.
4.  **Quantum Resistance:**
    -   By using 256-bit symmetric keys, Klistra.nu is resistant to Grover's algorithm, maintaining 128-bit security even against future quantum computers.
5.  **Server Blindness (Protected Pastes):**
    -   For password-protected pastes, the server and storage provider never see raw text, file content, decryption keys, or your password.

## 🔌 API Reference

The Klistra.nu API is fully documented using the OpenAPI Specification. You can find the complete definition in the [openapi.yaml](./openapi.yaml) file.

For development, you can use the `generate.sh` script to regenerate client and server types from this specification.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
