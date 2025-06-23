# Modern Architecture Patterns (Next.js 15 + React 19)

## Next.js 15 Key Changes

### Caching Strategy Updates

**New Default Behavior (2024)**:
- Fetch requests: Default caching is 'no-store'
- GET route handlers: Caching disabled by default  
- Client-side routing: Page components no longer cached by default

**Impact on Phonica**:
```typescript
// OLD: Automatically cached
const response = await fetch('/api/materials');

// NEW: Explicitly opt-in to caching
const response = await fetch('/api/materials', {
  cache: 'force-cache', // or other cache strategies
});
```

### Static Generation Optimization

**Build Performance Improvements**:
- Reuses first render instead of double-rendering
- Shared fetch cache across pages within workers
- Reduced build times for data-heavy applications

**Configuration in Phonica**:
```typescript
// next.config.ts - already optimized
const nextConfig: NextConfig = {
  output: 'standalone', // For Docker deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Audio file handling
    },
  },
};
```

### Server Components HMR Cache

**Development Performance**:
- Hot Module Replacement reuses fetch responses
- Reduces API calls during development
- Improves local development experience

## React 19 Integration Patterns

### useActionState Hook Usage

**Current Implementation** (Server Actions):
```typescript
// src/lib/actions/materials.ts - existing pattern
'use server';

export async function createMaterial(formData: FormData) {
  // Direct FormData processing
  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  // ... processing
}
```

**Enhanced with useActionState**:
```typescript
// Client component enhancement
'use client';
import { useActionState } from 'react';
import { createMaterial } from '@/lib/actions/materials';

export function MaterialForm() {
  const [state, formAction, isPending] = useActionState(createMaterial, {
    success: false,
    error: null,
  });

  return (
    <form action={formAction}>
      {/* Form fields */}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Material'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

### Server Actions vs API Routes Decision Tree

**Use Server Actions When**:
- Form submissions (FormData handling)
- Simple CRUD operations
- Direct database mutations
- Optimistic updates needed

**Use API Routes When**:
- Complex request/response processing
- File uploads with custom logic
- Third-party API integrations
- Non-form based operations

**Phonica Current Usage** (Correct Pattern):
- ✅ Server Actions: Material creation, updates
- ✅ API Routes: Search, file analysis, complex queries

## Server Components Best Practices

### Data Fetching Patterns

**Direct Database Access** (Server Components):
```typescript
// app/materials/page.tsx - server component
import { prisma } from '@/lib/prisma';

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    include: { tags: true, equipments: true },
  });

  return <MaterialsList materials={materials} />;
}
```

**With TanStack Query** (Client Components):
```typescript
// For interactive features requiring client state
'use client';
import { useQuery } from '@tanstack/react-query';

export function InteractiveMaterialsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => fetch('/api/materials').then(res => res.json()),
  });

  // ... interactive UI
}
```

### Performance Optimization Patterns

**Bundle Optimization**:
```typescript
// Dynamic imports for heavy components
const AudioPlayer = dynamic(() => import('@/components/audio/AudioPlayer'), {
  loading: () => <AudioPlayerSkeleton />,
  ssr: false, // Client-only for audio processing
});

const LeafletMap = dynamic(() => import('@/components/maps/MaterialLocationMap'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Maps are client-only
});
```

**Streaming with Suspense**:
```typescript
// app/materials/[slug]/page.tsx
import { Suspense } from 'react';

export default function MaterialPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <Suspense fallback={<MaterialDetailSkeleton />}>
        <MaterialDetail slug={params.slug} />
      </Suspense>
      <Suspense fallback={<RelatedMaterialsSkeleton />}>
        <RelatedMaterials slug={params.slug} />
      </Suspense>
    </div>
  );
}
```

## Error Boundaries and Error Handling

### Modern Error Handling Pattern

**Global Error Boundary**:
```typescript
// src/providers/error-boundary-provider.tsx - already implemented
'use client';

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**Server Action Error Handling**:
```typescript
// Structured error responses
export async function createMaterial(formData: FormData) {
  try {
    // ... processing
    return { success: true, data: material };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: 'CREATION_FAILED'
    };
  }
}
```

## File Upload Architecture

### Browser Compatibility Approach

**FormData Handling Strategy**:
```typescript
// 1. Server Actions (Recommended)
export async function uploadMaterial(formData: FormData) {
  // Internal FormData parsing - cross-browser compatible
}

// 2. API Routes (When needed)
export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    // ... processing
  } catch (error) {
    // Handle Firefox/WebKit boundary errors
    return NextResponse.json({ error: 'FormData parsing failed' }, { status: 400 });
  }
}
```

### Progressive Enhancement Pattern

**Implementation Strategy**:
1. **Default**: Server Actions for form submission
2. **Enhanced**: Client-side with TanStack Query for interactive features
3. **Fallback**: Traditional form submission if JavaScript fails

## Security Considerations

### Server Actions Security

**Input Validation**:
```typescript
import { z } from 'zod';

const materialSchema = z.object({
  title: z.string().min(1).max(255),
  file: z.instanceof(File),
  recordedAt: z.string().datetime(),
});

export async function createMaterial(formData: FormData) {
  const validatedInput = materialSchema.safeParse({
    title: formData.get('title'),
    file: formData.get('file'),
    recordedAt: formData.get('recordedAt'),
  });

  if (!validatedInput.success) {
    return { success: false, error: 'Invalid input' };
  }

  // ... safe processing
}
```

### File Upload Security

**Validation Pipeline**:
```typescript
// File type validation
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/flac'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function validateAudioFile(file: File): boolean {
  return (
    ALLOWED_MIME_TYPES.includes(file.type) &&
    file.size <= MAX_FILE_SIZE
  );
}
```

## Performance Monitoring

### Web Vitals Integration

**Built-in Metrics Collection**:
```typescript
// Next.js automatically collects Web Vitals
// Integrate with analytics tools for monitoring
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    console.log(metric); // Replace with analytics service
  }
}
```

### Bundle Analysis

**Regular Analysis Commands**:
```bash
# Analyze bundle size
npm run build
npm run analyze

# Monitor performance
npm run lighthouse
```

This architecture leverages Next.js 15 and React 19 features while maintaining compatibility and performance for the Phonica audio management system.