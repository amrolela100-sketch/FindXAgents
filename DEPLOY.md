# Deployment Guide for FindX

This project is fully containerized with Docker, making it easy to deploy to any cloud provider or VPS.

## Prerequisites

- **Docker** and **Docker Compose** installed on your server.
- Basic knowledge of terminal usage.

## 1. Setup Environment

1. Clone your repository to your production server.
2. Inside the `artifacts/api-server/` folder, copy `.env.example` to `.env` and fill in your real API keys.

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Make sure to provide at least the following to have full functionality:
- `OPENROUTER_API_KEY`: For AI scoring and outreach generation.
- `TAVILY_API_KEY`: For company data enrichment.
- `KVK_API_KEY` (or Google Maps): For lead discovery.

## 2. Build and Start Services

Run the following command in the root of the project to build the multi-stage Dockerfiles and start all services (PostgreSQL, API Server, and Nginx Frontend):

```bash
docker-compose up -d --build
```

- **`-d`**: Runs the containers in detached mode (in the background).
- **`--build`**: Ensures fresh builds of both frontend and backend using the root workspace context.

## 3. Verify Health

You can check if your services are healthy and running via:

```bash
docker-compose ps
```

The API service uses a `wget` healthcheck on the `/api/healthz` endpoint to ensure it's fully ready.
The PostgreSQL container has a `pg_isready` healthcheck.

## 4. Accessing the App

- **Frontend:** Accessible over port `80` (e.g. `http://your-server-ip/`).
- **API Server:** The frontend automatically proxies requests to `/api/*` directly to the backend container over the internal Docker network via Nginx.

## Architecture

- **PostgreSQL (`postgres:16-alpine`)**: Exposes port `5432` and stores data persistently using the `pgdata` volume.
- **Backend API (`node:24-alpine`)**: Serves the REST API on port `3000`. Runs database migrations automatically on startup.
- **Frontend SPA (`nginx:alpine`)**: Serves the Vite React app built output and proxies API calls.

## Troubleshooting

To view logs for all services:
```bash
docker-compose logs -f
```

To view logs for a specific service (e.g., the API):
```bash
docker-compose logs -f api
```

If the DB migrations fail or get stuck, check the connection string inside `.env` or in `docker-compose.yml`.
