import { useQuery } from '@tanstack/react-query';
import type { DashboardStats } from '@/types/dashboard';

/**
 * ダッシュボード統計データを取得するカスタムフック
 *
 * 機能:
 * - 統計サマリー（総素材数、総録音時間、平均レーティング、位置情報付き素材数）
 * - タグ別素材数（上位10タグ）
 * - 月別録音数（過去6ヶ月）
 * - 機材別使用頻度（上位10機材）
 *
 * キャッシュ設定: 5分間
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 10 * 60 * 1000, // 10分間メモリ保持
    retry: (failureCount, error) => {
      // 5xx エラーのみリトライ、最大3回
      if (error instanceof Error && error.message.includes('5')) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
