# System Requirements

This document outlines the system requirements for running the Phonica field recording material management tool.

## Overview

Phonica is a web-based application that manages field recording materials with automatic audio metadata extraction. The system consists of a Next.js web application, background workers for async processing, and requires specific system dependencies for audio file analysis.

## Minimum System Requirements

### Hardware Requirements

- **CPU**: 2 cores (4 cores recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**:
  - 2GB for application and dependencies
  - Additional space for audio file storage (varies by usage)
- **Network**: Stable internet connection for web access

### Operating System

- **Linux**: Ubuntu 20.04 LTS or newer, Debian 10+, CentOS 8+, or any modern Linux distribution
- **macOS**: macOS 11 (Big Sur) or newer
- **Windows**: Windows 10/11 with WSL2 (Windows Subsystem for Linux)

## Software Dependencies

### Core Requirements

1. **Node.js**: v20.0.0 or higher (LTS version recommended)

   ```bash
   # Check version
   node --version
   ```

2. **npm**: v10.0.0 or higher (comes with Node.js)

   ```bash
   # Check version
   npm --version
   ```

3. **PostgreSQL**: v14.0 or higher

   - Required for data persistence
   - Can be installed locally or via Docker

   ```bash
   # Check version
   psql --version
   ```

4. **Redis**: v6.0 or higher
   - Required for background job queue management
   - Can be installed locally or via Docker
   ```bash
   # Check version
   redis-server --version
   ```

### Audio Processing Requirements

5. **FFmpeg**: v4.0 or higher (REQUIRED for audio metadata extraction)

   - Must include ffprobe for metadata analysis

   **Installation:**

   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ffmpeg

   # macOS (using Homebrew)
   brew install ffmpeg

   # CentOS/RHEL/Fedora
   sudo dnf install ffmpeg

   # Verify installation
   ffmpeg -version
   ffprobe -version
   ```

### Optional (Recommended)

6. **Docker**: v20.10 or higher
   - For containerized deployment
   - Docker Compose v2.0 or higher
   ```bash
   # Check version
   docker --version
   docker-compose --version
   ```

## Browser Requirements

The web interface supports modern browsers:

- **Chrome/Chromium**: v90 or higher
- **Firefox**: v88 or higher
- **Safari**: v14 or higher
- **Edge**: v90 or higher

**Note**: Internet Explorer is not supported.

## Network Requirements

### Ports

The following ports need to be available:

- **3000**: Next.js web application (configurable)
- **5432**: PostgreSQL database
- **6379**: Redis server

### Firewall Configuration

If running behind a firewall, ensure the following:

- Inbound access to port 3000 (or configured application port)
- Outbound HTTPS access for npm package installation
- Internal access between application and database/Redis services

## File System Requirements

### Directory Permissions

The application requires read/write access to:

- `/public/uploads/materials/`: Permanent audio file storage
- `/tmp/phonica-uploads/`: Temporary file storage during processing
- Application directory for Next.js cache and build files

### File Upload Limits

- **Maximum file size**: 100MB per audio file (configurable)
- **Supported formats**: MP3, WAV, FLAC, M4A, OGG, AAC, WMA
- **Temporary storage**: At least 500MB for processing large files

## Performance Considerations

### Concurrent Processing

- The system can handle multiple file uploads simultaneously
- Background workers process metadata extraction asynchronously
- Recommended: 1 worker per 2 CPU cores

### Memory Usage

- Base application: ~500MB
- Per concurrent upload: ~50-100MB (depending on file size)
- PostgreSQL: ~200MB minimum
- Redis: ~100MB minimum

### Scaling Recommendations

For production deployments with high usage:

- Use separate servers/containers for web, worker, database, and Redis
- Implement load balancing for multiple web instances
- Use Redis clustering for high availability
- Consider object storage (S3, etc.) for audio files

## Docker Deployment

### Docker System Requirements

When using Docker, ensure:

- Docker daemon has at least 4GB memory allocated
- Sufficient disk space for images and volumes
- Docker BuildKit enabled for optimal build performance

### Pre-built Images

The application includes Dockerfiles for:

- Web service (with FFmpeg pre-installed)
- Worker service (with FFmpeg pre-installed)
- Development environment setup

## Installation Verification

After installing all dependencies, verify the setup:

```bash
# Check Node.js
node --version

# Check PostgreSQL
pg_isready

# Check Redis
redis-cli ping

# Check FFmpeg and ffprobe
ffmpeg -version
ffprobe -version

# Check ffprobe can analyze audio
ffprobe -v quiet -print_format json -show_format -show_streams /path/to/test/audio.mp3
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Error: "ffprobe command not found"
   - Solution: Install FFmpeg with your package manager
2. **Database connection failed**

   - Error: "ECONNREFUSED ::1:5432"
   - Solution: Ensure PostgreSQL is running and accepting connections

3. **Redis connection failed**

   - Error: "Redis connection to localhost:6379 failed"
   - Solution: Start Redis service

4. **File upload fails**
   - Error: "EACCES: permission denied"
   - Solution: Check directory permissions for uploads folder

### Getting Help

For additional support:

- Check the [Docker Setup Guide](./docker-setup.md) for containerized deployment
- Review application logs in development mode
- Ensure all system requirements are met

## Security Considerations

1. **File Uploads**: Implement virus scanning for production deployments
2. **FFmpeg**: Keep FFmpeg updated to patch security vulnerabilities
3. **Database**: Use strong passwords and encrypted connections
4. **File Permissions**: Restrict access to upload directories
5. **Network**: Use HTTPS in production, implement rate limiting

---

Last updated: 2025-06-04
