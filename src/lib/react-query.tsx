'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データの再取得間隔を設定（デフォルトは0で無効）
            staleTime: 60 * 1000, // 1分
            // キャッシュの保持時間（デフォルトは5分）
            gcTime: 10 * 60 * 1000, // 10分
            // ウィンドウフォーカス時の再取得を無効化
            refetchOnWindowFocus: false,
            // 再試行の設定
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && !process.env.CI && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
