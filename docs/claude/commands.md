# Commands Reference

## Development

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build production version
npm run start        # Start production server
```

## Code Quality

```bash
npm run lint         # Run ESLint
npm test            # Run all unit tests
npx tsc --noEmit    # Type check without emitting files
```

## Database

```bash
npx prisma migrate dev    # Run database migrations
npx prisma studio        # Open Prisma Studio for database inspection
npx prisma generate      # Generate Prisma Client
```

## E2E Testing

### 🚀 Basic Execution

```bash
npm run e2e              # Run all E2E tests in parallel (recommended)
npm run e2e:with-report  # Run tests and open HTML report
```

### 🌐 Browser-specific Execution (for development only)

```bash
npm run e2e:chrome       # Chromium only (fastest)
npm run e2e:cross-browser # Major browsers
```

### 📋 Feature-specific Execution (when needed)

```bash
npm run e2e:smoke        # Smoke tests only
npm run e2e:master       # Master data features
npm run e2e:materials    # Material management features
npm run e2e:workflows    # Workflow tests
```

### 🔍 Debugging & Detailed Execution

```bash
npm run e2e:ui       # UI mode for debugging
npm run e2e:debug    # Debug mode
npm run e2e:report   # Show last test report

# Run specific tests
npm run e2e -- --grep "Equipment.*validation"
```

### ⚠️ Notes

- `npm run e2e` uses parallel execution for faster test runs
- CI environment automatically limits workers to 1 for stability
- Use feature-specific tests only when testing specific functionality

### Database Management

```bash
npm run e2e:db:create   # Create E2E test database
npm run e2e:db:migrate  # Run migrations on E2E database
npm run e2e:db:seed     # Seed E2E database with test data
npm run e2e:db:drop     # Drop E2E test database
npm run e2e:db:setup    # Complete setup (create + migrate + seed)
```
