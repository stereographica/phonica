# Docker Setup Guide

This guide explains how to run Phonica using Docker for both development and production environments.

## Prerequisites

- Docker Desktop (for Mac/Windows) or Docker Engine (for Linux)
- Docker Compose v2.0 or higher
- At least 4GB of available RAM for Docker

## Architecture Overview

The Docker setup includes the following services:

1. **PostgreSQL** - Primary database for application data
2. **Redis** - Queue management for background jobs
3. **Web** - Next.js application server
4. **Worker** - Background job processor for file cleanup and async tasks

## Development Setup

For development, we recommend running only the infrastructure services (PostgreSQL and Redis) in Docker while running the application locally for hot reloading.

### 1. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Update DATABASE_URL and REDIS_URL to use localhost
DATABASE_URL=postgresql://phonica_user:phonica_password@localhost:5432/phonica_db
REDIS_URL=redis://localhost:6379
```

### 3. Run Application Locally

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev

# In another terminal, start the worker
npm run worker:dev
```

## Production Setup

For production, all services run in Docker containers.

### 1. Configure Environment Variables

```bash
# Copy the Docker environment example
cp .env.docker.example .env.docker

# Edit .env.docker with your production values
# Important: Generate a secure NEXTAUTH_SECRET
openssl rand -base64 32
```

### 2. Build and Start Services

```bash
# Build images and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 3. Initialize Database

On first run, the database migrations will be applied automatically. You can also run them manually:

```bash
docker-compose exec web npx prisma migrate deploy
```

### 4. Create Initial Data (Optional)

```bash
# Seed the database with sample data
docker-compose exec web npx prisma db seed
```

## Service Management

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres redis
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: Deletes all data)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f worker
```

### Accessing Services

- **Web Application**: http://localhost:3000
- **PostgreSQL**: localhost:5432 (use any PostgreSQL client)
- **Redis**: localhost:6379 (use redis-cli or any Redis client)

## File Uploads and Storage

The Docker setup includes proper volume mounting for file uploads:

- **Uploaded files**: `./public/uploads` (persisted on host)
- **Temporary files**: Docker volume `temp_uploads` (cleaned automatically)

The worker service runs periodic cleanup of temporary files older than 1 hour.

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs web
docker-compose logs worker

# Rebuild images
docker-compose build --no-cache
```

### Database Connection Issues

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready

# Test connection
docker-compose exec postgres psql -U phonica_user -d phonica_db
```

### File Permission Issues

```bash
# Fix upload directory permissions
docker-compose exec web chown -R nextjs:nodejs /app/public/uploads
docker-compose exec worker chown -R worker:nodejs /app/public/uploads
```

### FFmpeg/FFprobe Not Working

The Docker images include FFmpeg for audio metadata extraction. To verify:

```bash
# Check FFmpeg installation
docker-compose exec web ffmpeg -version
docker-compose exec worker ffprobe -version
```

## Performance Optimization

### Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Production Optimizations

1. Use Docker BuildKit for faster builds:

   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. Enable Next.js standalone output (already configured in Dockerfile)

3. Use multi-stage builds to reduce image size (already implemented)

## Backup and Restore

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U phonica_user phonica_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U phonica_user phonica_db < backup.sql
```

### File Backup

```bash
# Backup uploaded files
tar -czf uploads-backup.tar.gz ./public/uploads
```

## Security Considerations

1. **Change default passwords** in production
2. **Use secrets management** for sensitive environment variables
3. **Enable SSL/TLS** for production deployments
4. **Restrict port exposure** in production (only expose necessary ports)
5. **Regular security updates** for base images

## Monitoring

Consider adding monitoring services:

```yaml
# Add to docker-compose.yml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  ports:
    - '8080:8080'
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
```
