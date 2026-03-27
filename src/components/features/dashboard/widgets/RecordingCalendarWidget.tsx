'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar as CalendarIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecordingActivity } from '@/hooks/use-recording-activity';

export function RecordingCalendarWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 300 });
  const [isInitialized, setIsInitialized] = useState(false);

  // コンテナサイズに基づいた3段階表示期間計算
  const displayMonths = useMemo(() => {
    const { width } = containerDimensions;

    // 3段階切り替え: 大(12ヶ月), 中(6ヶ月), 小(3ヶ月)
    if (width >= 600) return 12; // 大: 12ヶ月
    if (width >= 400) return 6; // 中: 6ヶ月
    return 3; // 小: 3ヶ月
  }, [containerDimensions]);

  // カレンダーのグリッドデータを生成（GitHubスタイル: 右端が現在日付）
  const calendarData = useMemo(() => {
    const weeks: Date[][] = [];
    const today = new Date();

    // 今日を含む週の日曜日を取得
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 });

    // 月数ベースで表示範囲を正確に計算
    const startDate = new Date(today.getFullYear(), today.getMonth() - displayMonths + 1, 1);
    const startWeek = startOfWeek(startDate, { weekStartsOn: 0 });

    // 開始週から今日の週までの週数を計算
    const totalDays =
      Math.ceil((todayWeekStart.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24)) + 7;
    const totalWeeks = Math.ceil(totalDays / 7);

    for (let week = 0; week < totalWeeks; week++) {
      const weekDays: Date[] = [];
      const weekStart = addDays(startWeek, week * 7);

      for (let day = 0; day < 7; day++) {
        const date = addDays(weekStart, day);
        // 今日以降の日付は追加しない（過去のみ表示）
        if (date <= today) {
          weekDays.push(date);
        }
      }

      // 週に日付が含まれている場合のみ追加
      if (weekDays.length > 0) {
        weeks.push(weekDays);
      }
    }

    return weeks;
  }, [displayMonths]);

  // カレンダーデータから実際の日数を計算
  const actualDisplayDays = useMemo(() => {
    let totalDays = 0;
    calendarData.forEach((week) => {
      totalDays += week.length;
    });
    return totalDays;
  }, [calendarData]);

  const { data: activityData, isLoading, error, refetch } = useRecordingActivity(actualDisplayDays);

  // コンテナサイズを正確に取得
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        setContainerDimensions({ width, height });
        setIsInitialized(true);
      }
    };

    // 初期サイズ取得のための遅延
    const timeoutId = setTimeout(updateDimensions, 200);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
        setIsInitialized(true);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  // 実データから録音活動データを作成
  const recordingData = useMemo(() => {
    if (!activityData?.activities) return [];

    return activityData.activities.map((activity) => ({
      date: new Date(activity.date),
      count: activity.count,
    }));
  }, [activityData]);

  // 日付ごとのカウントマップを作成
  const dateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    recordingData.forEach(({ date, count }) => {
      map.set(format(date, 'yyyy-MM-dd'), count);
    });
    return map;
  }, [recordingData]);

  // 録音数に応じた色の強度を取得
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count === 1) return 'bg-green-300 dark:bg-green-800';
    if (count <= 3) return 'bg-green-400 dark:bg-green-700';
    if (count <= 5) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  // カレンダーデータから月ラベルと位置を抽出（完全同期）
  const monthInfo = useMemo(() => {
    const monthsJa = [
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月',
      '8月',
      '9月',
      '10月',
      '11月',
      '12月',
    ];

    const monthsData: Array<{
      label: string;
      weekIndex: number;
      monthNumber: number;
      year: number;
    }> = [];
    const seenMonths = new Set<string>();

    // カレンダーグリッドの週順序に従って月と位置を抽出
    for (let weekIndex = 0; weekIndex < calendarData.length; weekIndex++) {
      const week = calendarData[weekIndex];

      // 週の最初の日付を使用して月を特定
      if (week.length > 0) {
        const firstDateOfWeek = week[0];
        const year = firstDateOfWeek.getFullYear();
        const monthKey = `${year}-${firstDateOfWeek.getMonth()}`;
        const monthLabel = monthsJa[firstDateOfWeek.getMonth()];
        const monthNumber = firstDateOfWeek.getMonth() + 1; // 1-12

        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          monthsData.push({ label: monthLabel, weekIndex, monthNumber, year });
        }
      }
    }

    return monthsData;
  }, [calendarData]);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // ローディング状態
  if (isLoading) {
    return (
      <div ref={containerRef} className="space-y-1 h-full flex flex-col">
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 mb-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-3 w-3" />
            <span>録音活動を読み込み中...</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div ref={containerRef} className="space-y-1 h-full flex flex-col">
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 mb-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-3 w-3" />
            <span>録音活動</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">データの読み込みに失敗しました</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-1 h-full flex flex-col">
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3 w-3" />
          <span>過去{displayMonths}ヶ月間の録音活動</span>
          {activityData && (
            <span className="text-xs opacity-75">
              （総録音数: {activityData.totalRecordings}件）
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {/* カレンダーコンテンツを最大幅で制限し、センタリング */}
        <div className="h-full flex flex-col justify-center mx-auto" style={{ maxWidth: '800px' }}>
          {/* 月ラベル - カレンダーグリッドと正確に同期 */}
          <div className="relative mb-1 ml-7">
            {monthInfo.map((month) => {
              // 週の位置に応じて月ラベルを配置
              const leftPosition = month.weekIndex * (11 + 1); // cellSize + gap
              return (
                <div
                  key={`${month.label}-${month.weekIndex}`}
                  data-testid={`calendar-month-${month.year}-${month.monthNumber}`}
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${leftPosition}px` }}
                >
                  {month.label}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* 曜日ラベル */}
            <div className="flex flex-col gap-[3px] mr-1">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className="text-xs text-muted-foreground h-[11px] flex items-center"
                  style={{ visibility: index % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* カレンダーグリッド - サイズ最適化 */}
            <div className="flex gap-[1px] justify-center">
              {calendarData.map((week, weekIndex) => {
                // 動的セルサイズ計算
                const availableHeight = containerDimensions.height - 80;
                const cellSize = Math.min(Math.max(Math.floor(availableHeight / 10), 8), 12);

                return (
                  <div key={weekIndex} className="flex flex-col gap-[1px]">
                    {week.map((date, dayIndex) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const count = dateCountMap.get(dateStr) || 0;
                      const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                      const isFuture = date > new Date();

                      return (
                        <div
                          key={dayIndex}
                          className={`
                            rounded-sm transition-colors
                            ${isFuture ? 'bg-transparent' : getIntensityClass(count)}
                            ${isToday ? 'ring-1 ring-primary ring-offset-1' : ''}
                          `}
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                          }}
                          title={`${format(date, 'yyyy/MM/dd', { locale: ja })}: ${count}件の録音`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 凡例 */}
          {isInitialized && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
              <span data-testid="recording-calendar-legend-low">少</span>
              <div className="flex gap-1">
                {[0, 1, 3, 5, 7].map((level) => {
                  const availableHeight = containerDimensions.height - 80;
                  const cellSize = Math.min(Math.max(Math.floor(availableHeight / 10), 8), 12);
                  return (
                    <div
                      key={level}
                      className={`rounded-sm ${getIntensityClass(level)}`}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                      }}
                    />
                  );
                })}
              </div>
              <span data-testid="recording-calendar-legend-high">多</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
