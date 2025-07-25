import React from 'react';
import { Card } from '@/components/ui/card';

interface SkeletonProps {
  className?: string;
}

/**
 * 基本的なスケルトンアニメーション
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

/**
 * ウィジェット用スケルトン
 */
export function WidgetSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-6" />
        </div>

        {/* メインコンテンツ部分 */}
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * 統計ウィジェット用スケルトン
 */
export function StatisticsWidgetSkeleton() {
  return (
    <div className="space-y-2 h-full">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2">
          <Skeleton className="h-8 w-full" />
        </Card>
        <Card className="p-2">
          <Skeleton className="h-8 w-full" />
        </Card>
      </div>

      {/* タブとグラフエリア */}
      <div className="space-y-2">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

/**
 * リスト形式ウィジェット用スケルトン
 */
export function ListWidgetSkeleton({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-6 w-6" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      <Skeleton className="h-8 w-full" />
    </div>
  );
}

/**
 * 音声プレーヤー用スケルトン
 */
export function AudioPlayerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>

      <div className="space-y-3">
        <div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2 mt-1" />
        </div>

        <Skeleton className="h-12 w-full" />

        <div className="flex gap-1">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
    </div>
  );
}

/**
 * カレンダー用スケルトン
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-2 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-6" />
      </div>

      <div className="flex-1 space-y-2">
        {/* 月ラベル */}
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-3" />
          ))}
        </div>

        {/* 凡例 */}
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-3 w-8" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-3" />
            ))}
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

/**
 * 地図用スケルトン
 */
export function MapSkeleton() {
  return (
    <div className="space-y-2 h-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>

      <div className="flex-1 min-h-[200px]">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

/**
 * ダッシュボード全体用スケルトン
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* ウィジェットグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
    </div>
  );
}
