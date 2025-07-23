import { useQuery } from '@tanstack/react-query';
import type { RecordingActivityResponse } from '@/types/dashboard';

/**
 * 録音活動データを取得するカスタムフック
 *
 * 機能:
 * - 指定期間の日別録音数を取得
 * - 録音カレンダー用のヒートマップデータ
 * - 統計情報（総録音数、ピーク日）を含む
 *
 * キャッシュ設定: 10分間（録音活動の変更頻度は低いため）
 */
export function useRecordingActivity(days = 365, endDate?: string) {
  return useQuery<RecordingActivityResponse>({
    queryKey: ['recording-activity', days, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/dashboard/recording-activity?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch recording activity: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ
    gcTime: 30 * 60 * 1000, // 30分間メモリ保持（長め）
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
