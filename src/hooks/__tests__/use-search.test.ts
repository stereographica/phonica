import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch } from '../use-search';
import React from 'react';

// fetchのモック
global.fetch = jest.fn();

// テスト用のWrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function TestQueryProvider({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  TestQueryProvider.displayName = 'TestQueryProvider';
  return TestQueryProvider;
}

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with empty query and results', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.query).toBe('');
    expect(result.current.searchResults).toEqual({
      materials: [],
      tags: [],
      equipment: [],
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('debounces search query', async () => {
    const mockResponse = {
      data: {
        materials: [{ id: '1', title: 'Test' }],
        tags: [],
        equipment: [],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 1,
      },
      query: 'test',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    // クエリを更新
    act(() => {
      result.current.updateQuery('test');
    });

    // デバウンス中はfetchが呼ばれない
    expect(global.fetch).not.toHaveBeenCalled();

    // デバウンス時間を進める
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // fetchが呼ばれる
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/search?q=test'));
    });
  });

  it('returns empty results for empty query', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    // 空のクエリ
    act(() => {
      result.current.updateQuery('');
    });

    // デバウンス時間を進める
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // fetchは呼ばれない
    expect(global.fetch).not.toHaveBeenCalled();

    // 空の結果が返される
    expect(result.current.searchResults).toEqual({
      materials: [],
      tags: [],
      equipment: [],
    });
  });

  it('handles search errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search failed'));

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateQuery('error');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('updates results when search succeeds', async () => {
    const mockResponse = {
      data: {
        materials: [{ id: '1', title: 'Forest Sound', slug: 'forest-sound' }],
        tags: [{ id: '2', name: 'nature', slug: 'nature' }],
        equipment: [{ id: '3', name: 'Zoom H6' }],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 3,
      },
      query: 'forest',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateQuery('forest');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.searchResults.materials).toHaveLength(1);
      expect(result.current.searchResults.tags).toHaveLength(1);
      expect(result.current.searchResults.equipment).toHaveLength(1);
    });

    expect(result.current.searchResults.materials[0].title).toBe('Forest Sound');
    expect(result.current.searchResults.tags![0].name).toBe('nature');
    expect(result.current.searchResults.equipment![0].name).toBe('Zoom H6');
  });

  it('cancels previous search when query changes', async () => {
    const mockResponse1 = {
      data: { materials: [{ id: '1', title: 'First' }], tags: [], equipment: [] },
      pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
      query: 'first',
    };

    const mockResponse2 = {
      data: { materials: [{ id: '2', title: 'Second' }], tags: [], equipment: [] },
      pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
      query: 'second',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse2,
      });

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    // 最初のクエリ
    act(() => {
      result.current.updateQuery('first');
    });

    act(() => {
      jest.advanceTimersByTime(150);
    });

    // 2番目のクエリ（最初のデバウンスが完了する前）
    act(() => {
      result.current.updateQuery('second');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // 2番目のクエリのみが実行される
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('q=second'));
    });
  });
});
