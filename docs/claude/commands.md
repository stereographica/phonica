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
npm run e2e              # Run all E2E tests (Chrome)
npm run e2e:ui           # UI mode for debugging
npm run e2e:debug        # Debug mode
npm run e2e:report       # Show last test report
```

### 📋 Feature-specific Execution

```bash
npm run e2e:smoke        # Smoke tests only
npm run e2e:master       # Master data features
npm run e2e:materials    # Material management features
npm run e2e:workflows    # Workflow tests
```

### 🏭 CI Execution

```bash
npm run e2e:ci           # CI mode for Chrome (workers=1)
```

### 🔍 Advanced Usage

```bash
# Run specific tests
npm run e2e -- --grep "Equipment.*validation"

# Run tests with custom options (Chrome)
npm run e2e -- --headed

# Run tests with specific tags
npm run e2e -- --grep "@critical"
```

### ⚠️ Notes

- `npm run e2e` runs all tests in Chrome browser
- CI command automatically sets workers=1 for stability
- Use feature-specific tests to focus on specific functionality

### 📊 Database Management

```bash
npm run e2e:db:setup         # Complete setup (create + migrate + seed)
npm run e2e:db:cleanup       # Clean up test database
npm run e2e:db:cleanup-all   # Clean up all test databases
npm run e2e:db:full-cleanup  # Full cleanup including templates
npm run e2e:db:template-setup # Set up template database
```
