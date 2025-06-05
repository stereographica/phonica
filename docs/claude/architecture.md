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

## Browser Compatibility Issues

### FormData Boundary Error in Firefox/WebKit

When using multipart/form-data with FormData in Next.js 15 + Turbopack, Firefox and WebKit browsers may encounter a boundary parsing error. This is resolved by:

1. **Using Server Actions (Recommended)**: Server actions handle FormData parsing internally without browser-specific issues
2. **Test-specific Endpoints**: E2E tests use alternate endpoints for Firefox/WebKit to bypass the issue
3. **See `docs/formdata-browser-compatibility.md`** for detailed information and implementation guidelines

**Important**: Always prefer server actions for new form implementations to ensure cross-browser compatibility.
