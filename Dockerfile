# syntax=docker/dockerfile:1

# Stage 0: Get xx for cross-compilation helpers
FROM --platform=$BUILDPLATFORM tonistiigi/xx AS xx

# Stage 1: Build Frontend
FROM --platform=$BUILDPLATFORM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend

# Copy dependency definitions
COPY frontend/package.json frontend/bun.lock ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Copy openapi.yaml and source code
COPY openapi.yaml ../
COPY frontend/ .

# Generate frontend API types
RUN bunx openapi-typescript ../openapi.yaml -o src/api-types.ts

# Build the frontend
RUN bun run build

# Stage 2: Build Backend
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS backend-builder
COPY --from=xx / /
ARG TARGETPLATFORM
WORKDIR /app/backend

# Install necessary cross-compilation toolchain for CGO
RUN apt-get update && xx-apt-get install -y gcc libc6-dev

# Install oapi-codegen
RUN go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest

# Copy Go module definitions
COPY backend/go.mod backend/go.sum .

# Download dependencies with cache mount
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy openapi.yaml and backend source code
COPY openapi.yaml ../
COPY backend/ .

# Generate backend API code
RUN mkdir -p api && \
    oapi-codegen -package api -generate types,gin ../openapi.yaml > api/api.gen.go

# Build the application
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 xx-go build -o klistra-backend . && \
    xx-verify klistra-backend

# Stage 3: Runtime
FROM debian:bookworm-slim
WORKDIR /app/backend

# Install necessary runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from the backend builder
COPY --from=backend-builder /app/backend/klistra-backend .

# Copy the frontend build artifacts
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy openapi.yaml
COPY openapi.yaml /app/openapi.yaml

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["./klistra-backend"]