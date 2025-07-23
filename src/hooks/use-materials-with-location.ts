import { useQuery } from '@tanstack/react-query';
import type { MaterialsWithLocationResponse } from '@/types/dashboard';

/**
 * 位置情報付き素材データを取得するカスタムフック
 *
 * 機能:
 * - 位置情報（緯度・経度）を持つ素材のリストを取得
 * - 地図表示用に最適化されたデータ形式
 * - 地図の境界と中心点情報を含む
 *
 * キャッシュ設定: 5分間（位置情報の変更頻度は中程度のため）
 */
export function useMaterialsWithLocation(limit = 100, bounds?: string) {
  return useQuery<MaterialsWithLocationResponse>({
    queryKey: ['materials-with-location', limit, bounds],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (bounds) {
        params.append('bounds', bounds);
      }

      const response = await fetch(`/api/dashboard/materials-with-location?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch materials with location: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 15 * 60 * 1000, // 15分間メモリ保持
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
