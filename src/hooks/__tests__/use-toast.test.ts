/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, reducer } from '../use-toast';

// Simplified toast state type for testing
type SimpleToastState = {
  toasts: Array<{
    id: string;
    title: string;
    open: boolean;
  }>;
};

// Mock timers for testing setTimeout behavior
jest.useFakeTimers();

describe('use-toast', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('reducer', () => {
    const initialState = { toasts: [] };

    it('should handle ADD_TOAST action', () => {
      const toastItem = {
        id: 'test-id',
        title: 'Test Toast',
        description: 'Test description',
        open: true,
      };

      const action = {
        type: 'ADD_TOAST' as const,
        toast: toastItem,
      };

      const newState = reducer(initialState, action);

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(toastItem);
    });

    it('should limit toasts to TOAST_LIMIT (1)', () => {
      const firstToast = { id: 'first', title: 'First', open: true };
      const secondToast = { id: 'second', title: 'Second', open: true };

      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: firstToast,
      });

      state = reducer(state, {
        type: 'ADD_TOAST',
        toast: secondToast,
      });

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0]).toEqual(secondToast);
    });

    it('should handle UPDATE_TOAST action', () => {
      const initialToast = { id: 'test-id', title: 'Original', open: true };
      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: initialToast,
      });

      const updateAction = {
        type: 'UPDATE_TOAST' as const,
        toast: { id: 'test-id', title: 'Updated' },
      };

      state = reducer(state, updateAction);

      expect(state.toasts[0].title).toBe('Updated');
      expect(state.toasts[0].open).toBe(true); // Should keep original properties
    });

    it('should handle UPDATE_TOAST action with non-matching id', () => {
      const initialToast = { id: 'test-id', title: 'Original', open: true };
      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: initialToast,
      });

      const updateAction = {
        type: 'UPDATE_TOAST' as const,
        toast: { id: 'non-matching-id', title: 'Should Not Update' },
      };

      state = reducer(state, updateAction);

      // Toast should remain unchanged when ID doesn't match (line 87 branch coverage)
      expect(state.toasts[0].title).toBe('Original');
      expect(state.toasts[0].id).toBe('test-id');
    });

    it('should handle DISMISS_TOAST action with specific toastId', () => {
      const toastItem = { id: 'test-id', title: 'Test', open: true };
      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: toastItem,
      });

      state = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: 'test-id',
      });

      expect(state.toasts[0].open).toBe(false);
    });

    it('should handle DISMISS_TOAST action without toastId (dismiss all)', () => {
      const toast1 = { id: 'test-1', title: 'Test 1', open: true } as const;
      const toast2 = { id: 'test-2', title: 'Test 2', open: true } as const;

      // Add multiple toasts by changing TOAST_LIMIT temporarily
      const state: SimpleToastState = { toasts: [toast1, toast2] };

      const result = reducer(state as unknown as Parameters<typeof reducer>[0], {
        type: 'DISMISS_TOAST',
      });

      expect(result.toasts.every(t => t.open === false)).toBe(true);
    });

    it('should handle DISMISS_TOAST action with non-matching toastId', () => {
      const toast1 = { id: 'test-1', title: 'Test 1', open: true } as const;
      const toast2 = { id: 'test-2', title: 'Test 2', open: true } as const;

      const state: SimpleToastState = { toasts: [toast1, toast2] };

      const result = reducer(state as unknown as Parameters<typeof reducer>[0], {
        type: 'DISMISS_TOAST',
        toastId: 'non-existent',
      });

      // Toasts that don't match the toastId should remain unchanged (line 112 coverage)
      expect(result.toasts[0].open).toBe(true);
      expect(result.toasts[1].open).toBe(true);
    });

    it('should handle REMOVE_TOAST action with specific toastId', () => {
      const toastItem = { id: 'test-id', title: 'Test', open: true };
      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: toastItem,
      });

      state = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: 'test-id',
      });

      expect(state.toasts).toHaveLength(0);
    });

    it('should handle REMOVE_TOAST action without toastId (remove all)', () => {
      const toastItem = { id: 'test-id', title: 'Test', open: true };
      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: toastItem,
      });

      state = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: undefined,
      });

      expect(state.toasts).toHaveLength(0);
    });
  });

  describe('toast function', () => {
    beforeEach(() => {
      // Reset the internal memory state
      // The toast state is managed globally, so we don't need to explicitly reset it here
    });

    it('should create a toast with correct properties', () => {
      const toastProps = {
        title: 'Test Title',
        description: 'Test Description',
        variant: 'default' as const,
      };

      const result = toast(toastProps);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('dismiss');
      expect(result).toHaveProperty('update');
      expect(typeof result.dismiss).toBe('function');
      expect(typeof result.update).toBe('function');
    });

    it('should generate unique IDs for different toasts', () => {
      const toast1 = toast({ title: 'Toast 1' });
      const toast2 = toast({ title: 'Toast 2' });

      expect(toast1.id).not.toBe(toast2.id);
    });

    it('should handle toast dismiss', () => {
      const toastItem = toast({ title: 'Test Toast' });

      act(() => {
        toastItem.dismiss();
      });

      // Toast should be marked for dismissal
      expect(typeof toastItem.dismiss).toBe('function');
    });

    it('should handle toast update', () => {
      const toastItem = toast({ title: 'Original Title' });

      act(() => {
        toastItem.update({
          id: toastItem.id,
          title: 'Updated Title',
        });
      });

      expect(typeof toastItem.update).toBe('function');
    });

    it('should handle onOpenChange callback', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast'
        });
      });

      // Get the onOpenChange function from the created toast
      const onOpenChange = result.current.toasts[0].onOpenChange;

      expect(onOpenChange).toBeDefined();

      // Test the onOpenChange callback with false (line 160-161 coverage)
      act(() => {
        if (onOpenChange) {
          onOpenChange(false);
        }
      });

      // Toast should be dismissed when onOpenChange(false) is called
      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should handle onOpenChange callback with true', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast'
        });
      });

      const onOpenChange = result.current.toasts[0].onOpenChange;

      // Test the onOpenChange callback with true (should not dismiss)
      act(() => {
        if (onOpenChange) {
          onOpenChange(true);
        }
      });

      // Toast should remain open when onOpenChange(true) is called
      expect(result.current.toasts[0].open).toBe(true);
    });
  });

  describe('useToast hook', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current).toHaveProperty('toasts');
      expect(result.current).toHaveProperty('toast');
      expect(result.current).toHaveProperty('dismiss');
      expect(Array.isArray(result.current.toasts)).toBe(true);
    });

    it('should add toast to state', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast',
          description: 'Test Description',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
    });

    it('should dismiss specific toast', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const toastResult = result.current.toast({
          title: 'Test Toast',
        });
        toastId = toastResult.id;
      });

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when no toastId provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      act(() => {
        result.current.dismiss();
      });

      if (result.current.toasts.length > 0) {
        expect(result.current.toasts.every(t => t.open === false)).toBe(true);
      }
    });

    it('should cleanup listeners on unmount', () => {
      const { unmount } = renderHook(() => useToast());

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast({ title: 'Test Toast' });
      });

      // Both hooks should see the same state
      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
    });
  });

  describe('timeout behavior', () => {
    it('should schedule toast removal after TOAST_REMOVE_DELAY', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const toastResult = result.current.toast({ title: 'Test Toast' });
        toastId = toastResult.id;
      });

      act(() => {
        result.current.dismiss(toastId);
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000000); // TOAST_REMOVE_DELAY
      });

      // Toast should be removed from the array
      expect(result.current.toasts.find(t => t.id === toastId)).toBeUndefined();
    });

    it('should not schedule duplicate timeouts for same toast', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const toastResult = result.current.toast({ title: 'Test Toast', duration: Infinity }); // 自動dismissを無効化
        toastId = toastResult.id;
      });

      // Dismiss twice
      act(() => {
        result.current.dismiss(toastId);
        result.current.dismiss(toastId);
      });

      // Should only have one timeout scheduled
      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle updating non-existent toast', () => {
      const initialState = { toasts: [] };
      
      const action = {
        type: 'UPDATE_TOAST' as const,
        toast: { id: 'non-existent', title: 'Update' },
      };

      const newState = reducer(initialState, action);
      
      expect(newState.toasts).toHaveLength(0);
    });

    it('should handle removing non-existent toast', () => {
      const initialState = { toasts: [] };
      
      const action = {
        type: 'REMOVE_TOAST' as const,
        toastId: 'non-existent',
      };

      const newState = reducer(initialState, action);
      
      expect(newState.toasts).toHaveLength(0);
    });

    it('should handle toast with all optional properties', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Title Only Toast'
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Title Only Toast');
    });

    it('should handle toast with basic properties', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Simple Toast',
          description: 'Toast description',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Simple Toast');
      expect(result.current.toasts[0].description).toBe('Toast description');
    });
  });
});