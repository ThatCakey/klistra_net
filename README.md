# Klistra.nu

**Klistra.nu** is a secure, encrypted, and ephemeral pastebin platform designed to share sensitive text with peace of mind. Built with a focus on privacy and security, it ensures that your data is encrypted and stored securely.

## ✨ Features

- **🔐 Strong Encryption:** All pastes are encrypted using `XChaCha20-Poly1305`.
- **🛡️ Password Protection:** Optional password protection for your pastes.
- **⏳ Automatic Expiry:** Set a validity period (from 1 minute to 1 week). Pastes are automatically deleted from the database after expiry.
- **🌓 Dark & Light Mode:** A modern, responsive UI built with React and Tailwind CSS that adapts to your system preferences.
- **⚡ High Performance:** Powered by a high-performance Go backend and SQLite for efficient storage.
- **🕵️ Privacy First:** Minimal data retention. No database persistence beyond the specified expiry time.

## 🛠️ Technology Stack

- **Backend:** Go (Golang) 1.25+ with Gin framework
- **Database:** SQLite (used for local persistent storage)
- **Frontend:** React, Vite, Tailwind CSS
- **Containerization:** Docker & Docker Compose

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/klistra_nu.git
    cd klistra_nu
    ```

2.  **Configure Environment Variables**
    Create a `.env` file from the example provided:
    ```bash
    cp .env.example .env
    ```
    
    Open `.env` in your favorite editor and configure the following:
    - `WEB_PORT`: The port to expose the web interface on (e.g., `8080`).

3.  **Build and Run**
    Start the application using Docker Compose (Development):
    ```bash
    docker-compose -f docker-compose.dev.yml up --build
    ```

4.  **Access the Application**
    Open your browser and navigate to:
    `http://localhost:<WEB_PORT>` (e.g., `http://localhost:8080`)

## 📂 Project Structure

```
klistra_nu/
├── docker-compose.yml      # Production service orchestration
├── docker-compose.dev.yml  # Development service orchestration
├── .env.example            # Environment variable template
├── backend/                # Go Backend
│   ├── cmd/                # Entrypoints
│   ├── handlers/           # HTTP Handlers
│   ├── models/             # Data Models
│   ├── services/           # Core Logic (Encryption, DB)
│   └── main.go             # Application entry point
├── frontend/               # React Frontend
│   ├── src/                # Source code
│   └── vite.config.ts      # Vite Configuration
└── Dockerfile              # Multi-stage Docker build
```

## 🔒 Security Architecture

Klistra.nu implements a robust security approach:

1.  **Transport Layer:** Standard HTTPS (when deployed with a reverse proxy).
2.  **Application Layer:** 
    -   **Content Encryption:** Paste content is encrypted using `XChaCha20-Poly1305`.
    -   **Key Derivation:** Keys are derived using Argon2id with a unique, random salt generated for every paste.
    -   **Zero-Knowledge (Partial):** For unprotected pastes, the ID acts as the decryption key. For protected pastes, the password is required to derive the key.

## 🔌 API Reference

Klistra.nu exposes a RESTful API defined by the OpenAPI specification (`openapi.yaml`).

### Endpoints

#### 1. Create Paste
Creates a new paste.

*   **URL:** `/api/pastes`
*   **Method:** `POST`
*   **Payload:**
    ```json
    {
      "expiry": 3600,             // Expiry in seconds
      "passProtect": true,        // Enable password protection
      "pass": "UserPassword",     // Password (optional)
      "pasteText": "Secret Content"
    }
    ```
*   **Response:** `JSON`
    ```json
    {
      "id": "PASTE_ID",
      "protected": true,
      "timeoutUnix": 1234567890
    }
    ```

#### 2. Get Paste
Retrieves a paste.

*   **URL:** `/api/pastes/{id}`
*   **Method:** `GET`
*   **Headers:**
    - `X-Paste-Password`: Password (if protected)
*   **Response:** `JSON`
    ```json
    {
      "id": "PASTE_ID",
      "text": "Decrypted Content",
      "protected": true,
      "timeoutUnix": 1234567890
    }
    ```
    *If the paste is protected and no password is provided, `text` will be null.*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
