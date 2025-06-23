'use client';

import React, { useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// TODO: 実際のデータ取得とAPIコールを実装
export function TodaySoundWidget() {
  const [isLoading, setIsLoading] = useState(false);

  // プレースホルダーデータ
  const todayMaterial = {
    id: 'sample-1',
    title: '朝の鳥のさえずり',
    filePath: '/audio/sample.wav', // TODO: 実際のファイルパスに置き換え
    recordedAt: new Date('2024-01-15T06:30:00'),
    locationName: '代々木公園',
    tags: ['鳥', '朝', '公園'],
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // TODO: 新しいランダム素材を取得
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(), 'yyyy年MM月dd日', { locale: ja })}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8 w-8"
          aria-label="別の音を選択"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {todayMaterial && (
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm">{todayMaterial.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {format(todayMaterial.recordedAt, 'yyyy/MM/dd HH:mm')} • {todayMaterial.locationName}
            </p>
          </div>

          <div className="w-full">
            <AudioPlayer audioUrl={todayMaterial.filePath} />
          </div>

          {todayMaterial.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {todayMaterial.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
