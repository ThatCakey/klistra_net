# Stage 1: Build Frontend
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend

# Copy dependency definitions
COPY frontend/package.json frontend/bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY frontend/ .

# Build the frontend
RUN bun run build

# Stage 2: Build Backend
FROM golang:1.25-bookworm AS backend-builder
WORKDIR /app/backend

# Copy Go module definitions
COPY backend/go.mod backend/go.sum .

# Download dependencies
RUN go mod download

# Copy backend source code
COPY backend/ .

# Build the application
# CGO_ENABLED=1 is required for go-sqlite3
ENV CGO_ENABLED=1
RUN go build -o klistra-backend .

# Stage 3: Runtime
FROM debian:bookworm-slim
WORKDIR /app/backend

# Install necessary runtime dependencies (if any specific C libraries are needed, usually libc is enough for standard builds)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from the backend builder
COPY --from=backend-builder /app/backend/klistra-backend .

# Copy the frontend build artifacts to the location expected by the Go app
# The Go app expects "../frontend/dist" relative to its working directory (/app/backend)
# So we place it at /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy openapi.yaml
COPY openapi.yaml /app/openapi.yaml

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["./klistra-backend"]