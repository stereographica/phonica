'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { format, startOfWeek, addDays, subDays, differenceInWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

interface RecordingDay {
  date: Date;
  count: number;
}

// TODO: 実際のデータ取得とAPIコールを実装
export function RecordingCalendarWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 300 });
  const [isInitialized, setIsInitialized] = useState(false);

  // コンテナサイズを正確に取得
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        console.log('Calendar container size:', { width, height, rect });
        setContainerDimensions({ width, height });
        setIsInitialized(true);
      }
    };

    // 初期サイズ取得のための遅延
    const timeoutId = setTimeout(updateDimensions, 200);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log('ResizeObserver update:', { width, height });
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

  // コンテナサイズに基づいた動的表示日数計算
  const displayDays = useMemo(() => {
    const { width, height } = containerDimensions;
    console.log('Calculating display days for size:', { width, height });

    // 利用可能な高さを計算（ヘッダーと余白を除く）
    const availableHeight = Math.max(height - 80, 100); // ヘッダー、凡例、余白を除く
    const availableWidth = Math.max(width - 50, 200); // 曜日ラベルと余白を除く

    // セルサイズを適応的に計算
    const cellSize = Math.min(Math.floor(availableHeight / 8), 12); // 最大8行、最大12px
    const weeksVisible = Math.floor(availableWidth / (cellSize + 2)); // 表示可能な週数

    // 表示日数 = 週数 * 7
    const calculatedDays = Math.max(weeksVisible * 7, 84); // 最低12週間

    console.log('Calendar calculation:', {
      availableHeight,
      availableWidth,
      cellSize,
      weeksVisible,
      calculatedDays,
    });

    return Math.min(calculatedDays, 365); // 最大1年間
  }, [containerDimensions]);
  // プレースホルダーデータ生成（決定論的にしてSSRハイドレーションエラーを回避）
  const recordingData = useMemo(() => {
    const data: RecordingDay[] = [];
    const today = new Date();

    // 動的日数分のダミーデータを生成（シード値ベースで決定論的に）
    for (let i = 0; i < displayDays; i++) {
      const date = subDays(today, i);
      // 日付をシード値として使用し、決定論的にデータを生成
      const seed = date.getTime();
      const pseudoRandom = (seed * 9301 + 49297) % 233280;
      const normalizedRandom = pseudoRandom / 233280;

      // 30%の確率で録音あり
      if (normalizedRandom > 0.7) {
        const countSeed = (seed * 16807) % 2147483647;
        const countRandom = countSeed / 2147483647;
        data.push({
          date,
          count: Math.floor(countRandom * 5) + 1,
        });
      }
    }

    return data;
  }, [displayDays]);

  // 日付ごとのカウントマップを作成
  const dateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    recordingData.forEach(({ date, count }) => {
      map.set(format(date, 'yyyy-MM-dd'), count);
    });
    return map;
  }, [recordingData]);

  // カレンダーのグリッドデータを生成（過去のみ表示）
  const calendarData = useMemo(() => {
    const weeks: Date[][] = [];
    const today = new Date();
    // 過去のみ表示するため、今日から過去に遡る
    const endDate = today;
    const startDate = subDays(endDate, displayDays - 1);
    const adjustedStartDate = startOfWeek(startDate, { weekStartsOn: 0 }); // 日曜始まり
    const adjustedEndDate = startOfWeek(endDate, { weekStartsOn: 0 }); // 今日を含む週の日曜日

    const totalWeeks = differenceInWeeks(adjustedEndDate, adjustedStartDate) + 1;

    for (let week = 0; week < totalWeeks; week++) {
      const weekDays: Date[] = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(adjustedStartDate, week * 7 + day);
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
  }, [displayDays]);

  // 録音数に応じた色の強度を取得
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count === 1) return 'bg-green-300 dark:bg-green-800';
    if (count <= 3) return 'bg-green-400 dark:bg-green-700';
    if (count <= 5) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  // 表示期間に応じた月ラベルを生成
  const monthLabels = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, displayDays - 1);
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

    // 表示期間の月を収集
    const monthsInRange = new Set<number>();
    for (let i = 0; i < displayDays; i += 30) {
      // 約30日ごとにサンプリング
      const date = addDays(startDate, i);
      monthsInRange.add(date.getMonth());
    }

    // 月順に並べて返す
    return Array.from(monthsInRange)
      .sort()
      .map((month) => monthsJa[month]);
  }, [displayDays]);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div ref={containerRef} className="space-y-1 h-full flex flex-col">
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3 w-3" />
          <span>過去{displayDays}日間の録音活動</span>
        </div>
        <span className="text-xs opacity-75">
          {containerDimensions.width}x{containerDimensions.height}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col justify-center">
          {/* 月ラベル - より均等に配置 */}
          <div className="flex gap-[3px] mb-1 ml-7">
            {monthLabels.map((month) => (
              <div key={month} className="text-xs text-muted-foreground flex-1 text-center">
                {month}
              </div>
            ))}
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
              <span>少</span>
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
              <span>多</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
