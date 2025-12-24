# Klistra.nu

Klistra.nu is a secure, encrypted online pastebin platform that allows you to share password-protected text with peace of mind. It is designed to keep sensitive information safe with features like automatic expiry and strong encryption.

## Features

- **Secure Encryption:** Uses AES-256-GCM encryption for all pastes.
- **Password Protection:** Optionally protect your pastes with a password.
- **Automatic Expiry:** Set a validity period for your pastes (from 1 minute up to 1 week), after which they are automatically deleted.
- **Privacy Focused:** Minimal data retention and reliance on ephemeral storage (Redis).

## Technology Stack

- **Backend:** PHP
- **Database:** Redis (for high-performance, temporary data storage)
- **Containerization:** Docker & Docker Compose
- **Frontend:** HTML, CSS, JavaScript (jQuery)

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Installation & Run

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd klistra_nu
    ```

2.  **Configure Environment Variables:**
    Copy the example environment file and configure it.
    ```bash
    cp .env.example .env
    ```
    Open `.env` and update the following values:
    -   `WEB_PORT`: The host port to expose the web server on (e.g., `8080`).
    -   `ENCRYPTION_SALT`: **Critical.** Generate a long, random string for salt.
    -   `REDIS_REQUIREPASS`: **Critical.** Set a strong password for Redis.
    -   `REDIS_STORAGE_PATH`: Local path for Redis persistence.

3.  **Start the Application:**
    ```bash
    docker-compose up -d --build
    ```

4.  **Access the Application:**
    Open your browser and navigate to `http://localhost:<WEB_PORT>` (or the port you configured).

## Project Structure

-   `php/public/`: The main web application source code.
    -   `api/`: Backend API endpoints.
    -   `components/`: Reusable HTML/PHP UI components.
    -   `include/`: Core logic (Encryption, ID generation, Redis connection).
-   `dockerfiles/`: Docker build files.
-   `docker-compose.yml`: Service definition and orchestration.

## Security

The application uses `AES-256-GCM` for encrypting paste content. The encryption key is derived from the user-provided password (or a default) combined with the server-side `ENCRYPTION_SALT`. Additionally, a custom transport encryption layer is implemented for submitting data.
