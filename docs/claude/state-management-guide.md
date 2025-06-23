# State Management Guide (TanStack Query + React State)

## Current Implementation Analysis

### ✅ Actually Used Technologies
- **TanStack Query**: Server state management (search, data fetching)
- **React useState**: Local component state
- **Server Actions**: Form state and mutations
- **URL State**: Navigation and filters

### ❌ Listed but Unused
- **Jotai**: Package installed but no actual implementation found

## State Management Decision Framework

### When to Use Each Approach

**TanStack Query** - Server State:
```typescript
// ✅ Current usage in src/hooks/use-search.ts
export function useSearch() {
  const { data, isLoading, error } = useQuery<SearchApiResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      // Fetch search results
    },
  });
}
```

**React useState** - Local Component State:
```typescript
// ✅ Good for: UI state, form inputs, toggles
const [isModalOpen, setIsModalOpen] = useState(false);
const [query, setQuery] = useState('');
const [selectedItems, setSelectedItems] = useState<string[]>([]);
```

**Server Actions** - Form State and Mutations:
```typescript
// ✅ Current pattern in src/lib/actions/materials.ts
'use server';
export async function createMaterial(formData: FormData) {
  // Direct server-side processing
}
```

**URL State** - Navigation and Persistence:
```typescript
// ✅ For: filters, search params, pagination
const searchParams = useSearchParams();
const router = useRouter();

// Update URL state
router.push(`/materials?search=${query}&page=${page}`);
```

## TanStack Query Best Practices

### Configuration Optimization

**Current Setup** (src/lib/react-query.tsx):
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute - good for Phonica
      gcTime: 10 * 60 * 1000,      // 10 minutes - appropriate
      refetchOnWindowFocus: false,  // Prevents unnecessary calls
      retry: 1,                     // Conservative retry strategy
    },
  },
});
```

### Query Key Strategies

**Hierarchical Keys**:
```typescript
// ✅ Good pattern for Phonica
const queryKeys = {
  materials: ['materials'] as const,
  materialList: (filters: MaterialFilters) => 
    [...queryKeys.materials, 'list', filters] as const,
  materialDetail: (slug: string) => 
    [...queryKeys.materials, 'detail', slug] as const,
  
  search: ['search'] as const,
  searchResults: (query: string) => 
    [...queryKeys.search, 'results', query] as const,
};
```

### Mutation Patterns

**Optimistic Updates**:
```typescript
const updateMaterialMutation = useMutation({
  mutationFn: updateMaterial,
  onMutate: async (newMaterial) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['materials'] });
    
    // Snapshot previous value
    const previousMaterials = queryClient.getQueryData(['materials']);
    
    // Optimistically update
    queryClient.setQueryData(['materials'], (old) => 
      old.map(m => m.id === newMaterial.id ? newMaterial : m)
    );
    
    return { previousMaterials };
  },
  onError: (err, newMaterial, context) => {
    // Rollback on error
    queryClient.setQueryData(['materials'], context.previousMaterials);
  },
  onSettled: () => {
    // Always refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['materials'] });
  },
});
```

## Form State Management

### Server Actions with useActionState (React 19)

**Enhanced Form Pattern**:
```typescript
'use client';
import { useActionState } from 'react';

type FormState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export function MaterialForm() {
  const [state, formAction, isPending] = useActionState<FormState>(
    createMaterialAction,
    { success: false }
  );

  return (
    <form action={formAction}>
      <input 
        name="title" 
        className={state.fieldErrors?.title ? 'error' : ''}
      />
      {state.fieldErrors?.title && (
        <span className="error">{state.fieldErrors.title}</span>
      )}
      
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Material'}
      </button>
      
      {state.error && <div className="error">{state.error}</div>}
      {state.success && <div className="success">Material created!</div>}
    </form>
  );
}
```

### Complex Form State

**When React useState is Appropriate**:
```typescript
// Multi-step forms, complex validation
export function MaterialCreateForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<MaterialData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ... multi-step logic
}
```

## Global State Decisions

### Current Architecture (Recommended)

**No Global State Library Needed** for Phonica because:
1. **Server State**: Handled by TanStack Query
2. **URL State**: Handles filters, search, navigation
3. **Local State**: Component-level useState sufficient
4. **Form State**: Server Actions + useActionState

### When You Would Need Jotai

**Consider Jotai if**:
```typescript
// Example scenarios that would justify Jotai:

// 1. Complex cross-component state
const audioPlayerAtom = atom({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  queue: [],
});

// 2. Derived state across components
const selectedMaterialsAtom = atom<string[]>([]);
const selectedCountAtom = atom(get => get(selectedMaterialsAtom).length);

// 3. Persistent preferences
const userPreferencesAtom = atom({
  theme: 'dark',
  defaultView: 'grid',
  autoPlay: false,
});
```

**Current Phonica State Needs**:
- ✅ Search state: Handled by TanStack Query + local state
- ✅ Modal state: Local useState sufficient
- ✅ Form state: Server Actions handle it
- ✅ Navigation state: URL parameters handle it

### Performance Considerations

**TanStack Query + React State Advantages**:
```typescript
// ✅ Automatic caching and deduplication
const { data: materials } = useQuery({
  queryKey: ['materials', filters],
  queryFn: () => fetchMaterials(filters),
  staleTime: 60_000, // Cache for 1 minute
});

// ✅ Optimistic updates without complex state management
const mutation = useMutation({
  mutationFn: deleteMaterial,
  onMutate: async (id) => {
    // Optimistically remove from UI
    queryClient.setQueryData(['materials'], prev => 
      prev.filter(m => m.id !== id)
    );
  },
});

// ✅ Selective re-rendering with React.memo
const MaterialCard = React.memo(({ material }) => {
  // Only re-renders when material prop changes
});
```

## Migration Strategy (If Jotai Becomes Needed)

### Gradual Introduction

**Step 1**: Start with specific use cases
```typescript
// Only for truly global state
const audioPlayerAtom = atom({
  currentTrack: null,
  isPlaying: false,
});
```

**Step 2**: Integrate with TanStack Query
```typescript
// jotai-tanstack-query integration
import { atomWithQuery } from 'jotai-tanstack-query';

const materialsAtom = atomWithQuery(() => ({
  queryKey: ['materials'],
  queryFn: () => fetchMaterials(),
}));
```

**Step 3**: Maintain current patterns
- Keep TanStack Query for server state
- Keep useState for local component state
- Use Jotai only for cross-component shared state

## Performance Monitoring

### State Update Performance

**Monitoring Techniques**:
```typescript
// React DevTools Profiler integration
import { unstable_trace as trace } from 'scheduler/tracing';

const handleUpdate = (newState) => {
  trace('Material Update', performance.now(), () => {
    setMaterials(newState);
  });
};

// TanStack Query DevTools (already enabled in development)
// Shows cache hits, miss rates, and performance metrics
```

## Conclusion

**Current Architecture is Optimal** for Phonica's requirements:
- TanStack Query handles server state excellently
- React useState covers local component needs
- Server Actions manage form state efficiently
- URL parameters handle navigation state

**Recommendation**: Remove unused Jotai dependency or keep it for future use if complex cross-component state needs arise.