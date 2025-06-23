# Performance Optimization Guide (2024)

## Next.js 15 Performance Features

### Static Generation Optimizations

**Build Time Improvements**:
- **Shared Fetch Cache**: Workers share fetch cache across pages
- **Single Render Strategy**: Reuse first render instead of double-rendering
- **Reduced API Calls**: Cached responses prevent duplicate requests

**Phonica Implementation**:
```typescript
// Optimized data fetching in Server Components
export default async function MaterialsPage() {
  // This fetch will be cached and shared across workers
  const materials = await fetch('/api/materials', {
    next: { revalidate: 300 } // 5-minute revalidation
  }).then(res => res.json());

  return <MaterialsList materials={materials} />;
}
```

### Server Components HMR Cache

**Development Performance**:
```typescript
// Hot Module Replacement reuses fetch responses
// Prevents repeated API calls during development
async function getMaterials() {
  // In development, this response is cached across HMR updates
  const response = await fetch('/api/materials');
  return response.json();
}
```

### Edge Functions Optimization

**Middleware Performance**:
```typescript
// middleware.ts - optimized for edge runtime
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  // Fast execution at edge locations
  const url = new URL(request.url);
  
  // Simple redirects and header modifications
  if (url.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP) < 2.5s

**Image Optimization**:
```typescript
// Use Next.js Image component for automatic optimization
import Image from 'next/image';

export function MaterialThumbnail({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={300}
      height={200}
      priority={true} // For above-the-fold images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..." // Tiny base64 placeholder
    />
  );
}
```

**Font Optimization**:
```typescript
// app/layout.tsx - optimized font loading
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Ensures text remains visible during webfont load
  preload: true,
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### First Input Delay (FID) < 100ms

**Code Splitting Strategy**:
```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

// Audio player - heavy WebAudio API usage
const AudioPlayer = dynamic(() => import('@/components/audio/AudioPlayer'), {
  loading: () => <AudioPlayerSkeleton />,
  ssr: false, // Client-only for performance
});

// Map component - large Leaflet bundle
const MaterialMap = dynamic(() => import('@/components/maps/MaterialLocationMap'), {
  loading: () => <div>Loading map...</div>,
  ssr: false,
});

// Waveform - heavy audio processing
const WaveformVisualizer = dynamic(() => import('@/components/audio/WaveformVisualizer'), {
  loading: () => <WaveformSkeleton />,
});
```

**React.memo Optimization**:
```typescript
// Prevent unnecessary re-renders
import React from 'react';

const MaterialCard = React.memo(({ material, onSelect }) => {
  return (
    <div className="material-card">
      <h3>{material.title}</h3>
      <button onClick={() => onSelect(material.id)}>Select</button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for complex objects
  return (
    prevProps.material.id === nextProps.material.id &&
    prevProps.material.updatedAt === nextProps.material.updatedAt
  );
});
```

### Cumulative Layout Shift (CLS) < 0.1

**Layout Stability**:
```typescript
// Prevent layout shifts with proper sizing
export function MaterialsList({ materials }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {materials.map(material => (
        <div 
          key={material.id}
          className="h-64 w-full" // Fixed dimensions prevent shifts
        >
          <MaterialCard material={material} />
        </div>
      ))}
    </div>
  );
}

// Skeleton loaders with exact dimensions
export function MaterialCardSkeleton() {
  return (
    <div className="h-64 w-full animate-pulse">
      <div className="h-40 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded mt-2"></div>
      <div className="h-4 bg-gray-300 rounded mt-1 w-3/4"></div>
    </div>
  );
}
```

## React 19 Performance Features

### Enhanced Concurrent Features

**Automatic Batching**:
```typescript
// React 19 automatically batches these updates
function handleMaterialUpdate(materialId: string, updates: Partial<Material>) {
  setMaterials(prev => prev.map(m => 
    m.id === materialId ? { ...m, ...updates } : m
  ));
  setLastUpdated(Date.now()); // Batched with above update
  setIsModified(true); // Also batched
}
```

**useActionState Performance**:
```typescript
// Optimized form state management
import { useActionState } from 'react';

export function MaterialForm() {
  const [state, formAction, isPending] = useActionState(
    createMaterialAction,
    { success: false }
  );

  // isPending automatically manages loading states
  // No need for separate loading state management
  return (
    <form action={formAction}>
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Material'}
      </button>
    </form>
  );
}
```

## Bundle Optimization

### Tree Shaking Optimization

**Lodash Usage**:
```typescript
// ❌ Imports entire lodash library
import _ from 'lodash';

// ✅ Import specific functions
import { debounce, throttle } from 'lodash-es';
// Or even better, use native alternatives
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};
```

**Date Libraries**:
```typescript
// ❌ Heavy moment.js (deprecated)
import moment from 'moment';

// ✅ Lightweight date-fns with tree shaking
import { format, parseISO } from 'date-fns';

// ✅ Native Intl API for simple formatting
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};
```

### Code Splitting Strategies

**Route-based Splitting** (Automatic with App Router):
```typescript
// Each page is automatically code-split
// app/materials/page.tsx
// app/dashboard/page.tsx
// app/master/equipment/page.tsx
```

**Component-based Splitting**:
```typescript
// Heavy components loaded on demand
const components = {
  AudioPlayer: dynamic(() => import('@/components/audio/AudioPlayer')),
  MaterialMap: dynamic(() => import('@/components/maps/MaterialLocationMap')),
  WaveformVisualizer: dynamic(() => import('@/components/audio/WaveformVisualizer')),
};

// Load based on user interaction
const [showPlayer, setShowPlayer] = useState(false);

return (
  <div>
    <button onClick={() => setShowPlayer(true)}>
      Play Audio
    </button>
    {showPlayer && <components.AudioPlayer src={audioSrc} />}
  </div>
);
```

## Database Query Optimization

### Prisma Performance

**Optimized Queries**:
```typescript
// ✅ Include only necessary relations
const materials = await prisma.material.findMany({
  include: {
    tags: true,
    equipments: true,
    // Don't include projects unless needed
  },
  take: 20, // Pagination
  skip: page * 20,
  orderBy: { createdAt: 'desc' },
});

// ✅ Select specific fields for lists
const materialList = await prisma.material.findMany({
  select: {
    id: true,
    slug: true,
    title: true,
    createdAt: true,
    // Don't select large fields like memo for lists
  },
});
```

**Connection Pooling**:
```typescript
// lib/prisma.ts - optimized connection
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  // Connection pooling configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## TanStack Query Performance

### Cache Optimization

**Intelligent Stale Times**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Different stale times based on data volatility
      staleTime: (query) => {
        if (query.queryKey[0] === 'materials-list') return 60_000; // 1 minute
        if (query.queryKey[0] === 'material-detail') return 300_000; // 5 minutes
        if (query.queryKey[0] === 'master-data') return 3600_000; // 1 hour
        return 60_000; // Default 1 minute
      },
    },
  },
});
```

**Prefetching Strategies**:
```typescript
// Prefetch on hover for better UX
export function MaterialCard({ material }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['material', material.slug],
      queryFn: () => fetchMaterial(material.slug),
      staleTime: 300_000, // 5 minutes
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <Link href={`/materials/${material.slug}`}>
        {material.title}
      </Link>
    </div>
  );
}
```

### Background Synchronization

**Optimistic Updates with Rollback**:
```typescript
const updateMaterialMutation = useMutation({
  mutationFn: updateMaterial,
  onMutate: async (variables) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['materials'] });
    
    // Snapshot the previous value
    const previousMaterials = queryClient.getQueryData(['materials']);
    
    // Optimistically update to the new value
    queryClient.setQueryData(['materials'], (old) => 
      old.map(material => 
        material.id === variables.id 
          ? { ...material, ...variables.updates }
          : material
      )
    );
    
    return { previousMaterials };
  },
  onError: (err, variables, context) => {
    // If the mutation fails, use the context to roll back
    queryClient.setQueryData(['materials'], context.previousMaterials);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['materials'] });
  },
});
```

## Audio Processing Optimization

### WebAudio API Performance

**Efficient Audio Loading**:
```typescript
// Lazy load and decode audio
export function useAudioBuffer(src: string) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!src) return;

    setIsLoading(true);
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    fetch(src)
      .then(response => response.arrayBuffer())
      .then(data => audioContext.decodeAudioData(data))
      .then(buffer => {
        setBuffer(buffer);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Audio loading error:', error);
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [src]);

  return { buffer, isLoading };
}
```

### Waveform Rendering Optimization

**Canvas Performance**:
```typescript
// Efficient waveform drawing
export function WaveformCanvas({ audioBuffer, width, height }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      drawWaveform(ctx, audioBuffer, width, height);
    });
  }, [audioBuffer, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full"
    />
  );
}

function drawWaveform(ctx: CanvasRenderingContext2D, buffer: AudioBuffer, width: number, height: number) {
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.moveTo(0, amp);

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    // Sample reduction for performance
    for (let j = 0; j < step; j++) {
      const datum = data[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    
    ctx.lineTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }

  ctx.stroke();
}
```

## Monitoring and Analysis

### Performance Monitoring

**Web Vitals Tracking**:
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

// Custom performance tracking
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    // Send to analytics service
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      non_interaction: true,
    });
  }
}
```

### Bundle Analysis

**Regular Performance Audits**:
```bash
# Analyze bundle size
npm run build
npm run analyze

# Lighthouse performance audit
npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html

# Core Web Vitals monitoring
npx @web/test-runner --coverage --lighthouse
```

This comprehensive optimization strategy leverages Next.js 15 and React 19 features while maintaining excellent performance for Phonica's audio management requirements.