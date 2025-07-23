import { useQuery } from '@tanstack/react-query';
import type { UnorganizedMaterialsResponse } from '@/types/dashboard';

/**
 * 未整理素材データを取得するカスタムフック
 *
 * 機能:
 * - メタデータが不足している素材のリストを取得
 * - 不足項目の詳細情報を含む
 * - ページネーション対応
 *
 * キャッシュ設定: 1分間（データの変更頻度が高いため短めに設定）
 */
export function useUnorganizedMaterials(limit = 10) {
  return useQuery<UnorganizedMaterialsResponse>({
    queryKey: ['unorganized-materials', limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) {
        params.append('limit', limit.toString());
      }

      const response = await fetch(`/api/dashboard/unorganized?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch unorganized materials: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1分間キャッシュ（短め）
    gcTime: 5 * 60 * 1000, // 5分間メモリ保持
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
