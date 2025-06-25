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

  // プレースホルダーデータ（実際のAPIからデータを取得するまでの仮データ）
  // E2E環境では実際に存在するシードデータを使用
  const todayMaterial = {
    id: 'hot-spring-id',
    slug: 'hot-spring', // シードデータに存在するslug
    title: '温泉の音 ♨️',
    filePath: '/uploads/hot-spring.wav',
    recordedAt: new Date('2024-01-15T06:30:00'),
    locationName: '箱根温泉',
    tags: ['水音', '環境音', 'ASMR'],
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
            {todayMaterial.slug ? (
              <AudioPlayer audioUrl={`/api/materials/${todayMaterial.slug}/download?play=true`} />
            ) : (
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded text-center">
                音声ファイルが利用できません
              </div>
            )}
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
