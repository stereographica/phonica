import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import type { SearchApiResponse, SearchQueryParams } from '@/types/search';

const DEBOUNCE_DELAY = 300; // 300ms

export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [query]);

  // 検索APIへのクエリ
  const { data, isLoading, error } = useQuery<SearchApiResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length === 0) {
        return {
          data: {
            materials: [],
            tags: [],
            equipment: [],
          },
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
          },
          query: '',
        };
      }

      const params: SearchQueryParams = {
        q: debouncedQuery,
        type: 'all',
        limit: 10, // 各カテゴリの表示件数
      };

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });

      const response = await fetch(`/api/search?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    },
    enabled: true, // 常に有効（空文字の場合は空の結果を返す）
  });

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    query,
    updateQuery,
    searchResults: data?.data || {
      materials: [],
      tags: [],
      equipment: [],
    },
    isLoading: isLoading && debouncedQuery.length > 0,
    error,
  };
}
