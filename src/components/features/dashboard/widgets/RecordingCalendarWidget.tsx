'use client';

import React, { useMemo } from 'react';
import { format, startOfWeek, addDays, subDays, differenceInWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

interface RecordingDay {
  date: Date;
  count: number;
}

// TODO: 実際のデータ取得とAPIコールを実装
export function RecordingCalendarWidget() {
  // プレースホルダーデータ生成
  const recordingData = useMemo(() => {
    const data: RecordingDay[] = [];
    const today = new Date();

    // 過去365日分のダミーデータを生成
    for (let i = 0; i < 365; i++) {
      const date = subDays(today, i);
      // ランダムに録音データを生成（30%の確率で録音あり）
      if (Math.random() > 0.7) {
        data.push({
          date,
          count: Math.floor(Math.random() * 5) + 1,
        });
      }
    }

    return data;
  }, []);

  // 日付ごとのカウントマップを作成
  const dateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    recordingData.forEach(({ date, count }) => {
      map.set(format(date, 'yyyy-MM-dd'), count);
    });
    return map;
  }, [recordingData]);

  // カレンダーのグリッドデータを生成
  const calendarData = useMemo(() => {
    const weeks: Date[][] = [];
    const today = new Date();
    const startDate = subDays(today, 364); // 365日前から開始
    const adjustedStartDate = startOfWeek(startDate, { weekStartsOn: 0 }); // 日曜始まり

    const totalWeeks = differenceInWeeks(today, adjustedStartDate) + 1;

    for (let week = 0; week < totalWeeks; week++) {
      const weekDays: Date[] = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(adjustedStartDate, week * 7 + day);
        weekDays.push(date);
      }
      weeks.push(weekDays);
    }

    return weeks;
  }, []);

  // 録音数に応じた色の強度を取得
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count === 1) return 'bg-green-300 dark:bg-green-800';
    if (count <= 3) return 'bg-green-400 dark:bg-green-700';
    if (count <= 5) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const months = [
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
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarIcon className="h-4 w-4" />
        <span>過去365日間の録音活動</span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* 月ラベル */}
          <div className="flex gap-[3px] mb-1 ml-7">
            {months.map((month) => (
              <div
                key={month}
                className="text-xs text-muted-foreground"
                style={{ width: `${100 / 12}%` }}
              >
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

            {/* カレンダーグリッド */}
            <div className="flex gap-[3px]">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((date, dayIndex) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const count = dateCountMap.get(dateStr) || 0;
                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                    const isFuture = date > new Date();

                    return (
                      <div
                        key={dayIndex}
                        className={`
                          w-[11px] h-[11px] rounded-sm transition-colors
                          ${isFuture ? 'bg-transparent' : getIntensityClass(count)}
                          ${isToday ? 'ring-1 ring-primary ring-offset-1' : ''}
                        `}
                        title={`${format(date, 'yyyy/MM/dd', { locale: ja })}: ${count}件の録音`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 凡例 */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>少</span>
            <div className="flex gap-1">
              {[0, 1, 3, 5, 7].map((level) => (
                <div
                  key={level}
                  className={`w-[11px] h-[11px] rounded-sm ${getIntensityClass(level)}`}
                />
              ))}
            </div>
            <span>多</span>
          </div>
        </div>
      </div>
    </div>
  );
}
