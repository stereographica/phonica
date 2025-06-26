# Phonica

Field recording material management application built with Next.js 15, React 19, and TypeScript.

## Prerequisites

- Node.js 20.0.0+
- npm 10.0.0+
- PostgreSQL 14+
- Redis 7+
- FFmpeg or Sox (for E2E test audio file generation)

### Installing FFmpeg (Required for E2E tests)

**macOS:**

```bash
brew install ffmpeg
```

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [FFmpeg official website](https://ffmpeg.org/download.html)

## Quick Start

1. **Clone the repository:**

```bash
git clone https://github.com/stereographica/phonica.git
cd phonica
```

2. **Install dependencies:**

```bash
npm ci
```

3. **Set up environment variables:**

```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

4. **Set up the database:**

```bash
npx prisma migrate dev
```

5. **Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Running E2E Tests

E2E tests require test audio files and seed data. These are automatically generated when you run the tests:

```bash
npm run e2e
```

This command will:

1. Set up a test database
2. Generate required test audio files
3. Create seed data with audio files
4. Run the E2E tests

### E2E Test Requirements

- PostgreSQL must be running on port 5432
- Redis must be running on port 6379
- FFmpeg or Sox must be installed (for audio file generation)

### Troubleshooting E2E Tests

If you encounter issues:

1. **Check database connection:**

   ```bash
   # Verify PostgreSQL is running
   psql -U postgres -c "SELECT 1"
   ```

2. **Check Redis connection:**

   ```bash
   redis-cli ping
   # Should return "PONG"
   ```

3. **Verify audio file generation:**

   ```bash
   # Manually run setup script
   npx tsx scripts/setup-e2e-files.ts
   ```

4. **Check generated files:**

   ```bash
   # Test fixtures
   ls -la e2e/fixtures/

   # Seed data audio files
   ls -la public/uploads/
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run unit tests
- `npm run e2e` - Run E2E tests
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - Run TypeScript type checking

### E2E Test Scripts

- `npm run e2e` - Run all E2E tests with database setup
- `npm run e2e:ui` - Run E2E tests in UI mode for debugging
- `npm run e2e:chrome` - Run E2E tests on Chrome only
- `npm run e2e:firefox` - Run E2E tests on Firefox only
- `npm run e2e:webkit` - Run E2E tests on WebKit only

## Project Structure

```
phonica/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── lib/          # Utilities and shared logic
│   └── types/        # TypeScript types
├── prisma/           # Database schema and migrations
├── e2e/              # E2E tests (Playwright)
├── scripts/          # Utility scripts
└── public/           # Static assets
```

## Documentation

- [E2E Test Setup Guide](docs/e2e-test-setup.md)
- [Development Process](docs/development_process.md)
- [Architecture Overview](docs/claude/architecture.md)

## License

[Your License]
