# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phonica is a field recording material management tool built with Next.js and TypeScript. It's designed to efficiently manage audio recordings with metadata including location, equipment, tags, and technical specifications.

## Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build production version
npm run start        # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm test            # Run all tests
npx tsc --noEmit    # Type check without emitting files
```

### Database
```bash
npx prisma migrate dev    # Run database migrations
npx prisma studio        # Open Prisma Studio for database inspection
npx prisma generate      # Generate Prisma Client
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Jotai (atomic state management)
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Testing**: Jest with React Testing Library
- **Background Jobs**: BullMQ with Redis

### Directory Structure
- `/src/app/` - Next.js App Router pages and API routes
  - `(app)/` - Application pages with shared layout
  - `(api)/` - API route grouping
- `/src/components/` - React components organized by feature
- `/src/lib/` - Utility functions and shared logic
- `/src/types/` - TypeScript type definitions
- `/prisma/` - Database schema and migrations
- `/docs/` - Project documentation

### Key Design Patterns

1. **API Routes**: All API endpoints follow RESTful conventions in `/src/app/api/`
2. **Component Structure**: Components are organized by feature (materials, master, etc.)
3. **Form Handling**: Uses react-hook-form with zod validation
4. **Testing**: Each component and API route has corresponding test files

### Database Schema

The application uses these main entities:
- **Material**: Audio recordings with metadata
- **Project**: Groups of materials
- **Tag**: Labels for categorization
- **Equipment**: Recording equipment master data

Many-to-many relationships exist between materials and projects/tags/equipment.

## Development Guidelines

### Development Process
Please follow the structured development process documented in `docs/development_process.md`.

#### 1. Task Analysis and Planning
- Start with GitHub issues prioritized by `priority: {critical|high|medium|low}` labels
- Review all docs in `/docs/` directory for constraints and requirements
- **Before implementation, check for**:
  - Existing similar features
  - Functions/components with same or similar names
  - Duplicate API endpoints
  - Reusable common logic
- Create detailed implementation steps and determine optimal execution order

#### 2. Task Execution
- First, get latest main branch:
  ```bash
  git checkout main
  git pull origin main
  ```
- Create branch using naming convention:
  - `feature/issue-{number}-{description}` (new features)
  - `fix/issue-{number}-{description}` (bug fixes)
  - `test/issue-{number}-{description}` (test additions)
  - `refactor/issue-{number}-{description}` (refactoring)
- **IMPORTANT**: Never commit or push directly to the main branch. Always work on a separate branch and use PR
- Update issue status to `status: in progress`
- Use TodoWrite tool for task management
- Commit only when tests pass
- Follow TDD: Write tests before implementation
- For coverage improvement:
  1. Run `npm test` to check current coverage
  2. Identify code paths that increase coverage most
  3. Add tests and verify coverage improvement

#### 3. Quality Management
- Run quality checks:
  - `npm test` - All tests pass
  - `npm run lint` - No lint errors
  - `npx tsc --noEmit` - No type errors
  - `npm run dev` - Dev server runs
- Fix all errors in current task
- For existing errors outside task scope: Check if GitHub issue exists, create if needed (Step 8)

#### 4. Pull Request Creation
- Include in PR body:
  ```markdown
  # {Task Name}
  
  ## Summary
  [Brief overview]
  
  ## Implementation Steps
  1. [Step and result]
  2. [Step and result]
  
  ## Final Deliverables
  [Details of what was created/changed]
  
  ## Issues Addressed (if applicable)
  - Problems encountered and solutions
  
  ## Related issue
  - Closes #[issue-number]
  ```

#### 5. User Review Request
- Complete self-checklist before requesting review
- Provide specific test steps for user
- Address reported bugs and add edge cases to tests

#### 6. Post-Review
- User will merge PR after review completion (Claude does not merge PRs)
- Create issues for any problems found during development with:
  - Target location
  - Problem description
  - Proposed solution
  - Related information
  - Acceptance criteria

### Testing Requirements
- Aim for 100% test coverage
- Write tests before implementation (TDD approach)
- Test files use `.test.ts` or `.test.tsx` suffix
- Mock Prisma client is configured in jest.setup.ts
- Commit only when tests pass

### Code Conventions
- Use TypeScript strict mode
- Follow existing patterns for component structure
- Use path aliases (`@/` for src directory)
- Implement proper error handling in API routes
- Remove debug code and console.logs before committing

### Quality Checklist
Before creating a PR, ensure:
- [ ] All tests pass (`npm test`)
- [ ] No lint errors (`npm run lint`)
- [ ] No type errors (`npx tsc --noEmit`)
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Coverage hasn't decreased
- [ ] New files have corresponding test files

### Important Notes
- Do not change technology stack versions without approval
- Avoid duplicate implementations - check for existing similar functionality
- UI/UX design changes require prior approval
- Address issues listed in docs/issues.md when instructed
- Create GitHub issues for any problems found during development

### Background Jobs
The application uses BullMQ for background tasks like ZIP file generation. Redis is required for job queue management.