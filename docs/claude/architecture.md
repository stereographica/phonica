# Architecture

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Jotai (atomic state management)
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Testing**: Jest with React Testing Library
- **E2E Testing**: Playwright
- **Background Jobs**: BullMQ with Redis

## Directory Structure

- `/src/app/` - Next.js App Router pages and API routes
  - `(app)/` - Application pages with shared layout
  - `(api)/` - API route grouping
- `/src/components/` - React components organized by feature
- `/src/lib/` - Utility functions and shared logic
- `/src/types/` - TypeScript type definitions
- `/prisma/` - Database schema and migrations
- `/docs/` - Project documentation
- `/e2e/` - End-to-end tests with Playwright
  - `fixtures/` - Test configuration and custom fixtures
  - `helpers/` - Reusable test helper classes for common operations
  - `tests/` - Test files organized by feature area
    - `master/` - Master data management tests (Equipment, Tags)
    - `materials/` - Material CRUD and listing tests
    - `workflows/` - Complex user journey and integration tests

## Key Design Patterns

1. **API Routes**: All API endpoints follow RESTful conventions in `/src/app/api/`
2. **Component Structure**: Components are organized by feature (materials, master, etc.)
3. **Form Handling**: Uses react-hook-form with zod validation
4. **Testing**: Each component and API route has corresponding test files

## Database Schema

The application uses these main entities:

- **Material**: Audio recordings with metadata
- **Project**: Groups of materials
- **Tag**: Labels for categorization
- **Equipment**: Recording equipment master data

Many-to-many relationships exist between materials and projects/tags/equipment.

## Background Jobs

The application uses BullMQ for background tasks like ZIP file generation. Redis is required for job queue management.

## E2E Testing Configuration

### Chrome-only Strategy

E2E tests are configured to run exclusively on Chrome (Chromium) to provide:

1. **Consistent Test Environment**: Eliminates browser-specific test failures and improves reliability
2. **Faster CI Execution**: Single browser testing reduces CI time and resource usage by ~70%
3. **Simplified Maintenance**: Reduces complexity in test maintenance and debugging
4. **Reliable FormData Handling**: Chrome provides consistent FormData behavior with Next.js 15

### Test Organization

Tests are organized into feature-specific groups for efficient parallel execution:

- **Smoke Tests**: Critical functionality verification
- **Master Data Tests**: Equipment and tag management
- **Material Tests**: CRUD operations for audio materials
- **Workflow Tests**: End-to-end user journeys

This organization allows selective test execution during development while ensuring comprehensive coverage in CI.
