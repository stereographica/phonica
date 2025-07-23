import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RandomMaterialResponse } from '@/types/dashboard';

/**
 * ランダム素材データを取得するカスタムフック
 *
 * 機能:
 * - データベースからランダムに素材を1つ取得
 * - 音声プレーヤー用の詳細データと波形データを含む
 * - リフレッシュ機能付き（キャッシュなしで常に新しいデータを取得）
 *
 * キャッシュ設定: なし（常に新しいランダム素材を取得）
 */
export function useRandomMaterial() {
  const queryClient = useQueryClient();

  const result = useQuery<RandomMaterialResponse>({
    queryKey: ['random-material'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/random-material');

      if (!response.ok) {
        throw new Error(`Failed to fetch random material: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 0, // キャッシュなし - 常に新鮮なデータ
    gcTime: 0, // ガベージコレクション時間なし
    retry: (failureCount, error) => {
      // 5xx エラーのみリトライ、最大3回
      if (error instanceof Error && error.message.includes('5')) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // リフレッシュ機能
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['random-material'] });
  };

  return {
    ...result,
    refresh,
  };
}
